"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DraftBoard } from "@/components/DraftBoard";
import { FailurePanel } from "@/components/FailurePanel";
import { PlayersPanel } from "@/components/PlayersPanel";
import { ProfileSelector } from "@/components/ProfileSelector";
import { StatusNotice } from "@/components/StatusNotice";
import { TokenPanel } from "@/components/TokenPanel";
import { PROFILES } from "@/data/profiles";
import {
  DDragonLoadError,
  loadChampions,
} from "@/lib/ddragon";
import { NO_PEERS_TIMEOUT_MSG, connectRoom, disconnectRoom, setChampionCatalog, subscribeRoomStatus } from "@/lib/room";
import { scoreComp } from "@/lib/score";
import {
  isLocalStorageAvailable,
  LOCAL_STORAGE_UNAVAILABLE_MSG,
} from "@/lib/storage";
import {
  decodeRoom,
  encodeRoom,
  deriveRoomNameFromRid,
  formatMissingChampionsMessage,
  generateRoomId,
  replaceLocationHash,
  type RoomState,
} from "@/lib/token";
import type { Champion, Pick, Player } from "@/lib/types";
import { useDraft } from "@/state/useDraft";

function toScorePicks(
  team: (Champion | null)[],
  players: Player[] | null,
): Pick[] {
  const out: Pick[] = [];
  team.forEach((champ, roleIdx) => {
    if (!champ) return;
    const tier = players?.[roleIdx]?.tiers[champ.id] ?? null;
    out.push({ champ, tier, roleIdx });
  });
  return out;
}

function toRoomState(
  draft: {
    profileKey: RoomState["profileKey"];
    picks: RoomState["picks"];
    bans: RoomState["bans"];
    players: Player[];
  },
  rid: string,
): RoomState {
  return {
    profileKey: draft.profileKey,
    picks: draft.picks,
    bans: draft.bans,
    players: draft.players,
    rid,
  };
}

function roomStatusLabel(
  signalingConnected: boolean,
  peerCount: number,
): string {
  if (!signalingConnected) return "Hors ligne";
  if (peerCount === 0) return "Seul dans la salle";
  return `${peerCount} pair${peerCount === 1 ? "" : "s"} connecté${peerCount === 1 ? "" : "s"}`;
}

export default function Home() {
  const [version, setVersion] = useState<string | null>(null);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loadError, setLoadError] = useState<DDragonLoadError | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomStatus, setRoomStatus] = useState({
    signalingConnected: false,
    peerCount: 0,
    noPeersTimedOut: false,
  });
  const [patchWarning, setPatchWarning] = useState<string | null>(null);
  const [hashNotice, setHashNotice] = useState<string | null>(null);
  const [showStorageNotice, setShowStorageNotice] = useState(false);
  const [showNoPeersNotice, setShowNoPeersNotice] = useState(true);
  const draft = useDraft();
  const profile = PROFILES[draft.profileKey];
  const restoredRef = useRef(false);
  const hashTimer = useRef<number | null>(null);
  const lastWrittenRidRef = useRef<string | null>(null);

  useEffect(() => {
    setShowStorageNotice(!isLocalStorageAvailable());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadChampions();
        if (cancelled) return;
        setLoadError(null);
        setVersion(data.version);
        setChampions(data.champions);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof DDragonLoadError) {
          setLoadError(e);
          return;
        }
        setLoadError(
          new DDragonLoadError(
            "network",
            "Impossible de charger les champions depuis Data Dragon. Vérifie ta connexion et réessaie.",
          ),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (!champions.length) return;
    setChampionCatalog(champions);
  }, [champions]);

  useEffect(() => subscribeRoomStatus(setRoomStatus), []);

  useEffect(() => {
    if (roomStatus.noPeersTimedOut) setShowNoPeersNotice(true);
  }, [roomStatus.noPeersTimedOut]);

  // Restauration depuis le hash une fois le roster chargé
  useEffect(() => {
    if (!champions.length || restoredRef.current) return;
    restoredRef.current = true;
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) {
      setRoomId(generateRoomId());
      return;
    }
    const result = decodeRoom(decodeURIComponent(raw), champions);
    if (result.ok) {
      setRoomId(result.state.rid ?? generateRoomId());
      draft.loadRoom(result.state);
      if (result.missingChampionIds.length) {
        setPatchWarning(
          formatMissingChampionsMessage(result.missingChampionIds),
        );
      }
    } else {
      setRoomId(generateRoomId());
      setHashNotice(
        "Le lien dans l'URL est illisible ou corrompu. Une nouvelle salle a été créée — repartage le lien à ton équipe.",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once on load
  }, [champions]);

  const token = useMemo(() => {
    if (!champions.length || !roomId) return "";
    return encodeRoom(toRoomState(draft, roomId));
  }, [champions.length, draft.profileKey, draft.picks, draft.bans, draft.players, roomId]);

  const roomName = useMemo(
    () => (roomId ? deriveRoomNameFromRid(roomId) : null),
    [roomId],
  );

  useEffect(() => {
    console.log("[room] page mount/update", {
      roomId,
      roomName,
      tokenHasRid: roomId != null,
      hash: typeof window !== "undefined" ? window.location.hash.slice(0, 40) + "…" : "",
    });
  }, [roomId, roomName]);

  useEffect(() => {
    console.log("[room] connect effect run", {
      deps: { roomName },
      action: roomName ? "connectRoom" : "disconnectRoom",
    });
    if (!roomName) {
      disconnectRoom();
      return () => {
        console.log("[room] connect effect cleanup (no roomName)");
        disconnectRoom();
      };
    }
    connectRoom(roomName);
    setShowNoPeersNotice(true);
    return () => {
      console.log("[room] connect effect cleanup", { roomName });
      disconnectRoom();
    };
  }, [roomName]);

  // rid (ou changement de salle) : hash immédiat, sans throttle
  useEffect(() => {
    if (!token || !roomId) return;
    if (lastWrittenRidRef.current === roomId) return;
    lastWrittenRidRef.current = roomId;
    console.log("[room] hash immediate (rid)", { roomId });
    replaceLocationHash(token);
  }, [token, roomId]);

  // Reste du payload : hash throttle 500 ms
  useEffect(() => {
    if (!token || !restoredRef.current || !roomId) return;
    if (hashTimer.current != null) window.clearTimeout(hashTimer.current);
    hashTimer.current = window.setTimeout(() => {
      const next = `#${token}`;
      if (window.location.hash !== next) {
        console.log("[room] hash throttled (draft payload)");
        replaceLocationHash(token);
      }
    }, 500);
    return () => {
      if (hashTimer.current != null) window.clearTimeout(hashTimer.current);
    };
  }, [token, roomId]);

  const blueEval = useMemo(
    () => scoreComp(toScorePicks(draft.picks.blue, draft.players), profile),
    [draft.picks.blue, draft.players, profile],
  );

  const redEval = useMemo(
    () => scoreComp(toScorePicks(draft.picks.red, null), profile),
    [draft.picks.red, profile],
  );

  const handleLoadToken = (raw: string) => {
    const result = decodeRoom(raw, champions);
    if (!result.ok) return result;
    if (result.state.rid) {
      setRoomId(result.state.rid);
    }
    draft.loadRoom(result.state);
    if (result.missingChampionIds.length) {
      const warning = formatMissingChampionsMessage(result.missingChampionIds);
      setPatchWarning(warning);
      return { ok: true as const, patchWarning: warning };
    }
    setPatchWarning(null);
    return { ok: true as const };
  };

  const handleNewDraft = () => {
    draft.reset();
  };

  const handleLeaveRoom = () => {
    setRoomId(generateRoomId());
  };

  const retryLoad = () => {
    setLoadError(null);
    setVersion(null);
    setChampions([]);
    setLoadAttempt((n) => n + 1);
  };

  if (loadError) {
    const isParse = loadError.kind === "parse";
    return (
      <FailurePanel
        title={
          isParse
            ? "Données champions illisibles"
            : "Data Dragon injoignable"
        }
        message={loadError.message}
        actions={[
          {
            label: "Réessayer",
            onClick: retryLoad,
          },
        ]}
      />
    );
  }

  if (!version) {
    return (
      <div className="mx-auto max-w-[1240px] px-3.5 py-3.5">
        <p className="font-cond text-[11px] tracking-[0.1em] text-dim">
          Chargement du patch depuis Data Dragon…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-3.5 pb-14 pt-3.5">
      {showStorageNotice ? (
        <StatusNotice
          tone="info"
          message={LOCAL_STORAGE_UNAVAILABLE_MSG}
          onDismiss={() => setShowStorageNotice(false)}
        />
      ) : null}

      {hashNotice ? (
        <StatusNotice
          message={hashNotice}
          onDismiss={() => setHashNotice(null)}
        />
      ) : null}

      {patchWarning ? (
        <StatusNotice
          message={patchWarning}
          onDismiss={() => setPatchWarning(null)}
        />
      ) : null}

      {roomStatus.noPeersTimedOut && showNoPeersNotice ? (
        <StatusNotice
          message={NO_PEERS_TIMEOUT_MSG}
          onDismiss={() => setShowNoPeersNotice(false)}
        />
      ) : null}

      <header className="flex flex-wrap items-end justify-between gap-2.5 border-b border-line pb-2.5">
        <div>
          <h1 className="font-cond text-[26px] leading-none tracking-[0.14em]">
            Draft<span className="text-gold">.</span>board
          </h1>
          <p className="font-cond mt-1 text-[11px] tracking-[0.1em] text-dim">
            Patch {version} · {champions.length} champions · aucune donnée stockée
          </p>
        </div>
        <div className="flex items-end gap-2.5">
          {roomId ? (
            <p className="font-cond text-[11px] tracking-[0.08em] text-dim">
              {roomStatusLabel(roomStatus.signalingConnected, roomStatus.peerCount)}
            </p>
          ) : null}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setPlayersOpen((o) => !o)}
              className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Joueurs
            </button>
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Quitter la salle
            </button>
            <button
              type="button"
              onClick={handleNewDraft}
              className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Nouvelle draft
            </button>
          </div>
        </div>
      </header>

      <ProfileSelector
        value={draft.profileKey}
        onChange={draft.setProfile}
      />

      <DraftBoard
        version={version}
        champions={champions}
        picks={draft.picks}
        bans={draft.bans}
        used={draft.used}
        players={draft.players}
        profile={profile}
        blueEval={blueEval}
        redEval={redEval}
        onSetPick={draft.setPick}
        onSetBan={draft.setBan}
      />

      <PlayersPanel
        open={playersOpen}
        onToggle={() => setPlayersOpen((o) => !o)}
        version={version}
        champions={champions}
        players={draft.players}
        onUpdatePlayer={draft.updatePlayer}
        onCycleTier={draft.cyclePlayerTier}
        onRemoveFromPool={draft.removeFromPool}
      />

      <TokenPanel token={token} onLoadToken={handleLoadToken} />
    </div>
  );
}

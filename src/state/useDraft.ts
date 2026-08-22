"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { PROFILES, type ProfileKey } from "@/data/profiles";
import {
  loadMyRoleIndex,
  loadPlayerStats,
  saveMyRoleIndex,
  savePlayerStats,
} from "@/lib/playerLocalStorage";
import {
  getChampionById,
  getDraftMap,
  isRoomConnected,
  readSharedDraft,
  readSharedPlayers,
  hasSharedDraftKeys,
  subscribeChampionCatalog,
  subscribeDraftMap,
  subscribePlayersMap,
  subscribeRoomStatus,
  writeSharedDraft,
  writeSharedPlayer,
  type SharedDraftPayload,
  type SharedPlayerEntry,
} from "@/lib/room";
import { playerTiersToTierLists, tierListsToPlayerTiers } from "@/lib/tierList";
import { decodeTierSeed, encodeTierSeed } from "@/lib/tierSeed";
import type { Champion, Player, TierLabel } from "@/lib/types";

export type TeamId = "blue" | "red";

export const ROLE_LABELS = ["TOP", "JGL", "MID", "ADC", "SUP"] as const;

type TeamChampions = (Champion | null)[];
type TeamBans = string[];
type TeamPickIds = { blue: string[]; red: string[] };

const LOCAL_ORIGIN = "local";
const emptyPickIds = (): TeamPickIds => ({
  blue: ["", "", "", "", ""],
  red: ["", "", "", "", ""],
});
const emptyBanIds = (): TeamBans => ["", "", "", "", ""];

function resolvePickIds(ids: string[]): TeamChampions {
  return ids.map((id) => {
    if (!id) return null;
    return getChampionById(id) ?? null;
  });
}

function picksToIds(picks: { blue: TeamChampions; red: TeamChampions }): TeamPickIds {
  return {
    blue: picks.blue.map((p) => p?.id ?? ""),
    red: picks.red.map((p) => p?.id ?? ""),
  };
}

function hasLocalDraftContent(
  pickIds: TeamPickIds,
  bans: { blue: TeamBans; red: TeamBans },
): boolean {
  for (const team of ["blue", "red"] as const) {
    if (pickIds[team].some((id) => id)) return true;
    if (bans[team].some((id) => id)) return true;
  }
  return false;
}

function sharedPayload(
  profileKey: ProfileKey,
  pickIds: TeamPickIds,
  bans: { blue: TeamBans; red: TeamBans },
): SharedDraftPayload {
  return { profileKey, picks: pickIds, bans };
}

function entryFromPlayer(player: Player): SharedPlayerEntry {
  return {
    name: player.name,
    tierSeed: encodeTierSeed(
      playerTiersToTierLists(player.tiers as Record<string, TierLabel>),
    ),
  };
}

function playerFromSharedEntry(
  entry: SharedPlayerEntry,
  roleIndex: number,
  isMine: boolean,
  localOpgg: string,
): Player {
  const decoded = decodeTierSeed(entry.tierSeed);
  const tiers = decoded.ok ? tierListsToPlayerTiers(decoded.lists) : {};
  return {
    name: entry.name,
    opgg: isMine ? localOpgg : "",
    tiers,
    stats: isMine ? loadPlayerStats(roleIndex) : {},
  };
}

export function emptyPlayers(): Player[] {
  return [0, 1, 2, 3, 4].map(() => ({
    name: "",
    opgg: "",
    tiers: {},
    stats: {},
  }));
}

function isProfileKey(value: string): value is ProfileKey {
  return Object.prototype.hasOwnProperty.call(PROFILES, value);
}

export function useDraft(initialProfile: ProfileKey = "teamfight") {
  const [pickIds, setPickIds] = useState(emptyPickIds);
  const [bans, setBans] = useState({
    blue: emptyBanIds(),
    red: emptyBanIds(),
  });
  const [profileKey, setProfileKey] = useState<ProfileKey>(initialProfile);
  const [players, setPlayers] = useState<Player[]>(emptyPlayers);
  const [myRoleIndex, setMyRoleIndexState] = useState<number | null>(() =>
    loadMyRoleIndex(),
  );
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [roomLive, setRoomLive] = useState(false);
  const localOpggRef = useRef<string[]>(["", "", "", "", ""]);
  const playersRef = useRef(players);
  playersRef.current = players;

  const picks = useMemo(
    () => ({
      blue: resolvePickIds(pickIds.blue),
      red: resolvePickIds(pickIds.red),
    }),
    [pickIds, catalogVersion],
  );

  useEffect(() => subscribeChampionCatalog(() => setCatalogVersion((v) => v + 1)), []);

  useEffect(
    () =>
      subscribeRoomStatus(() => {
        setRoomLive(isRoomConnected());
      }),
    [],
  );

  const applyRemoteDraft = useCallback((payload: SharedDraftPayload) => {
    setProfileKey(
      isProfileKey(payload.profileKey) ? payload.profileKey : "teamfight",
    );
    setPickIds({
      blue: [...payload.picks.blue],
      red: [...payload.picks.red],
    });
    setBans({
      blue: [...payload.bans.blue],
      red: [...payload.bans.red],
    });
  }, []);

  const applyRemotePlayers = useCallback(
    (remote: ReturnType<typeof readSharedPlayers>, ownRole: number | null) => {
      setPlayers((prev) =>
        prev.map((p, i) => {
          if (i === ownRole) {
            localOpggRef.current[i] = p.opgg;
            return { ...p, stats: loadPlayerStats(i) };
          }
          const entry = remote[i];
          if (!entry) {
            return { name: "", opgg: "", tiers: {}, stats: {} };
          }
          return playerFromSharedEntry(entry, i, false, "");
        }),
      );
    },
    [],
  );

  const publishMyPlayer = useCallback(
    (player: Player) => {
      if (myRoleIndex === null || !isRoomConnected()) return;
      writeSharedPlayer(myRoleIndex, entryFromPlayer(player));
    },
    [myRoleIndex],
  );

  const pushSharedDraft = useCallback(
    (
      nextProfile: ProfileKey,
      nextPickIds: TeamPickIds,
      nextBans: { blue: TeamBans; red: TeamBans },
    ) => {
      if (!isRoomConnected() || !getDraftMap()) return;
      writeSharedDraft(sharedPayload(nextProfile, nextPickIds, nextBans));
    },
    [],
  );

  useEffect(() => {
    let cleanupObserve: (() => void) | undefined;

    const unsubMap = subscribeDraftMap((map) => {
      cleanupObserve?.();

      const onMapChange = (_event: Y.YMapEvent<unknown>, tr: Y.Transaction) => {
        if (tr.origin === LOCAL_ORIGIN) return;
        const remote = readSharedDraft(map);
        if (remote) applyRemoteDraft(remote);
      };

      map.observe(onMapChange);

      if (hasSharedDraftKeys(map)) {
        const remote = readSharedDraft(map);
        if (remote) applyRemoteDraft(remote);
      }

      cleanupObserve = () => map.unobserve(onMapChange);
    });

    return () => {
      cleanupObserve?.();
      unsubMap();
    };
  }, [applyRemoteDraft]);

  useEffect(() => {
    let cleanupObserve: (() => void) | undefined;

    const unsubMap = subscribePlayersMap((map) => {
      cleanupObserve?.();

      const onMapChange = (_event: Y.YMapEvent<unknown>, tr: Y.Transaction) => {
        if (tr.origin === LOCAL_ORIGIN) return;
        applyRemotePlayers(readSharedPlayers(map), myRoleIndex);
      };

      map.observe(onMapChange);

      if (map.size > 0) {
        applyRemotePlayers(readSharedPlayers(map), myRoleIndex);
      }

      cleanupObserve = () => map.unobserve(onMapChange);
    });

    return () => {
      cleanupObserve?.();
      unsubMap();
    };
  }, [applyRemotePlayers, myRoleIndex]);

  const setMyRoleIndex = useCallback(
    (index: number) => {
      if (index < 0 || index > 4) return;
      saveMyRoleIndex(index);
      setMyRoleIndexState(index);
      setPlayers((prev) => {
        const next = prev.map((p, i) =>
          i === index ? { ...p, stats: loadPlayerStats(index) } : p,
        );
        const mine = next[index]!;
        if (
          isRoomConnected() &&
          (mine.name || Object.keys(mine.tiers).length > 0)
        ) {
          writeSharedPlayer(index, entryFromPlayer(mine));
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (!roomLive || myRoleIndex === null) return;
    const player = playersRef.current[myRoleIndex];
    if (!player.name && Object.keys(player.tiers).length === 0) return;
    publishMyPlayer(player);
  }, [roomLive, myRoleIndex, publishMyPlayer]);

  const setPick = useCallback(
    (team: TeamId, index: number, champ: Champion | null) => {
      setPickIds((prev) => {
        const next = {
          ...prev,
          [team]: prev[team].map((id, i) => (i === index ? (champ?.id ?? "") : id)),
        };
        pushSharedDraft(profileKey, next, bans);
        return next;
      });
    },
    [bans, profileKey, pushSharedDraft],
  );

  const setBan = useCallback(
    (team: TeamId, index: number, id: string) => {
      setBans((prev) => {
        const next = {
          ...prev,
          [team]: prev[team].map((v, i) => (i === index ? id : v)),
        };
        pushSharedDraft(profileKey, pickIds, next);
        return next;
      });
    },
    [pickIds, profileKey, pushSharedDraft],
  );

  const setProfile = useCallback(
    (key: ProfileKey) => {
      setProfileKey(key);
      pushSharedDraft(key, pickIds, bans);
    },
    [pickIds, bans, pushSharedDraft],
  );

  const updatePlayer = useCallback(
    (index: number, patch: Partial<Player>) => {
      if (myRoleIndex === null || index !== myRoleIndex) return;
      setPlayers((prev) => {
        const next = prev.map((p, i) => (i === index ? { ...p, ...patch } : p));
        const updated = next[index]!;
        if (patch.stats !== undefined) {
          savePlayerStats(index, updated.stats);
        }
        if (patch.opgg !== undefined) {
          localOpggRef.current[index] = updated.opgg;
        }
        if (patch.name !== undefined || patch.tiers !== undefined) {
          publishMyPlayer(updated);
        }
        return next;
      });
    },
    [myRoleIndex, publishMyPlayer],
  );

  const loadRoom = useCallback(
    (state: {
      profileKey: ProfileKey;
      picks: { blue: TeamChampions; red: TeamChampions };
      bans: { blue: TeamBans; red: TeamBans };
      players: Player[];
    }) => {
      const nextPickIds = picksToIds(state.picks);
      const nextBans = {
        blue: [...state.bans.blue],
        red: [...state.bans.red],
      };
      setProfileKey(state.profileKey);
      setPickIds(nextPickIds);
      setBans(nextBans);
      state.players.forEach((p, i) => {
        if (Object.keys(p.stats).length) savePlayerStats(i, p.stats);
        localOpggRef.current[i] = p.opgg;
      });
      setPlayers(
        state.players.map((p, i) => ({
          name: p.name,
          opgg: p.opgg,
          tiers: { ...p.tiers },
          stats: { ...p.stats },
        })),
      );
      if (hasLocalDraftContent(nextPickIds, nextBans)) {
        pushSharedDraft(state.profileKey, nextPickIds, nextBans);
      }
    },
    [pushSharedDraft],
  );

  const importPlayerTiers = useCallback(
    (index: number, tiers: Record<string, TierLabel>) => {
      if (myRoleIndex === null || index !== myRoleIndex) return;
      setPlayers((prev) => {
        const next = prev.map((p, i) =>
          i === index ? { ...p, tiers: { ...tiers } } : p,
        );
        publishMyPlayer(next[index]!);
        return next;
      });
    },
    [myRoleIndex, publishMyPlayer],
  );

  const reset = useCallback(() => {
    const nextPickIds = emptyPickIds();
    const nextBans = { blue: emptyBanIds(), red: emptyBanIds() };
    setPickIds(nextPickIds);
    setBans(nextBans);
    pushSharedDraft(profileKey, nextPickIds, nextBans);
  }, [profileKey, pushSharedDraft]);

  const used = useMemo(() => {
    const ids = new Set<string>();
    for (const team of ["blue", "red"] as const) {
      for (const id of pickIds[team]) {
        if (id) ids.add(id);
      }
      for (const id of bans[team]) {
        if (id) ids.add(id);
      }
    }
    return ids;
  }, [pickIds, bans]);

  return {
    picks,
    bans,
    profileKey,
    players,
    myRoleIndex,
    setMyRoleIndex,
    setPick,
    setBan,
    setProfile,
    updatePlayer,
    importPlayerTiers,
    loadRoom,
    reset,
    used,
  };
}

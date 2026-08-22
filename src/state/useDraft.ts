"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import { PROFILES, type ProfileKey } from "@/data/profiles";
import {
  getChampionById,
  getDraftMap,
  isRoomConnected,
  readSharedDraft,
  hasSharedDraftKeys,
  subscribeChampionCatalog,
  subscribeDraftMap,
  writeSharedDraft,
  type SharedDraftPayload,
} from "@/lib/room";
import type { Champion, Player, TierLabel } from "@/lib/types";

export type TeamId = "blue" | "red";

export const ROLE_LABELS = ["TOP", "JGL", "MID", "ADC", "SUP"] as const;

type TeamChampions = (Champion | null)[];
type TeamBans = string[];
type TeamPickIds = { blue: string[]; red: string[] };

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

export function emptyPlayers(): Player[] {
  return [0, 1, 2, 3, 4].map(() => ({
    name: "",
    opgg: "",
    tiers: {},
    stats: {},
  }));
}

function nextTier(cur: TierLabel | undefined): TierLabel | null {
  if (cur === "S") return "A";
  if (cur === "A") return "B";
  if (cur === "B") return null;
  return "S";
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
  const [catalogVersion, setCatalogVersion] = useState(0);

  const picks = useMemo(
    () => ({
      blue: resolvePickIds(pickIds.blue),
      red: resolvePickIds(pickIds.red),
    }),
    [pickIds, catalogVersion],
  );

  useEffect(() => subscribeChampionCatalog(() => setCatalogVersion((v) => v + 1)), []);

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
        if (tr.origin === "local") return;
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
      setPlayers((prev) =>
        prev.map((p, i) => (i === index ? { ...p, ...patch } : p)),
      );
    },
    [],
  );

  const cyclePlayerTier = useCallback((index: number, champId: string) => {
    setPlayers((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const tiers = { ...p.tiers };
        const next = nextTier(tiers[champId]);
        if (next) tiers[champId] = next;
        else delete tiers[champId];
        return { ...p, tiers };
      }),
    );
  }, []);

  const removeFromPool = useCallback((index: number, champId: string) => {
    setPlayers((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const tiers = { ...p.tiers };
        delete tiers[champId];
        return { ...p, tiers };
      }),
    );
  }, []);

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
      setPlayers(
        state.players.map((p) => ({
          ...p,
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
    setPick,
    setBan,
    setProfile,
    updatePlayer,
    cyclePlayerTier,
    removeFromPool,
    loadRoom,
    reset,
    used,
  };
}

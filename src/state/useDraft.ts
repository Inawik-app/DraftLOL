"use client";

import { useCallback, useMemo, useState } from "react";
import type { ProfileKey } from "@/data/profiles";
import type { Champion, Player, TierLabel } from "@/lib/types";

export type TeamId = "blue" | "red";

export const ROLE_LABELS = ["TOP", "JGL", "MID", "ADC", "SUP"] as const;

type TeamChampions = (Champion | null)[];
type TeamBans = string[];

const emptyPicks = (): TeamChampions => [null, null, null, null, null];
const emptyBans = (): TeamBans => ["", "", "", "", ""];

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

export function useDraft(initialProfile: ProfileKey = "teamfight") {
  const [picks, setPicks] = useState({
    blue: emptyPicks(),
    red: emptyPicks(),
  });
  const [bans, setBans] = useState({
    blue: emptyBans(),
    red: emptyBans(),
  });
  const [profileKey, setProfileKey] = useState<ProfileKey>(initialProfile);
  const [players, setPlayers] = useState<Player[]>(emptyPlayers);

  const setPick = useCallback(
    (team: TeamId, index: number, champ: Champion | null) => {
      setPicks((prev) => ({
        ...prev,
        [team]: prev[team].map((v, i) => (i === index ? champ : v)),
      }));
    },
    [],
  );

  const setBan = useCallback((team: TeamId, index: number, id: string) => {
    setBans((prev) => ({
      ...prev,
      [team]: prev[team].map((v, i) => (i === index ? id : v)),
    }));
  }, []);

  const setProfile = useCallback((key: ProfileKey) => {
    setProfileKey(key);
  }, []);

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

  const loadRoom = useCallback((state: {
    profileKey: ProfileKey;
    picks: { blue: TeamChampions; red: TeamChampions };
    bans: { blue: TeamBans; red: TeamBans };
    players: Player[];
  }) => {
    setProfileKey(state.profileKey);
    setPicks({
      blue: [...state.picks.blue],
      red: [...state.picks.red],
    });
    setBans({
      blue: [...state.bans.blue],
      red: [...state.bans.red],
    });
    setPlayers(state.players.map((p) => ({ ...p, tiers: { ...p.tiers }, stats: { ...p.stats } })));
  }, []);

  const reset = useCallback(() => {
    setPicks({ blue: emptyPicks(), red: emptyPicks() });
    setBans({ blue: emptyBans(), red: emptyBans() });
  }, []);

  const used = useMemo(() => {
    const ids = new Set<string>();
    for (const team of ["blue", "red"] as const) {
      for (const p of picks[team]) {
        if (p) ids.add(p.id);
      }
      for (const id of bans[team]) {
        if (id) ids.add(id);
      }
    }
    return ids;
  }, [picks, bans]);

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

"use client";

import { useCallback, useMemo, useState } from "react";
import type { ProfileKey } from "@/data/profiles";
import type { Champion } from "@/lib/types";

export type TeamId = "blue" | "red";

type TeamChampions = (Champion | null)[];
type TeamBans = string[];

const emptyPicks = (): TeamChampions => [null, null, null, null, null];
const emptyBans = (): TeamBans => ["", "", "", "", ""];

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
    setPick,
    setBan,
    setProfile,
    reset,
    used,
  };
}

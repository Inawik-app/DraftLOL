import {
  ROLES_BY_INDEX,
  championPlaysRole,
  secondaryRoleMalus,
} from "@/data/roles";
import { scoreComp } from "./score";
import type {
  Champion,
  Pick,
  Player,
  Profile,
  TierLabel,
} from "./types";

const AFFINITY_WEIGHT: Record<TierLabel, number> = {
  S: 1,
  A: 0.7,
  B: 0.4,
};

export type RoleSuggestions = {
  champions: Champion[];
  /** True when no champion matched the slot role — full roster used instead. */
  roleFilterWidened: boolean;
};

function filled(slots: (Pick | null)[]): Pick[] {
  const out: Pick[] = [];
  for (const p of slots) {
    if (p) out.push(p);
  }
  return out;
}

export function suggestForRole(
  roleIdx: number,
  picks: (Pick | null)[],
  profile: Profile,
  players: Player[],
  available: Champion[],
): RoleSuggestions {
  const taken = new Set<string>();
  for (const p of picks) {
    if (p) taken.add(p.champ.id);
  }

  const player = players[roleIdx];
  const before = scoreComp(filled(picks), profile).score;
  const slotRole = ROLES_BY_INDEX[roleIdx]!;

  let candidates = available.filter(
    (c) => !taken.has(c.id) && championPlaysRole(c.id, slotRole),
  );
  let roleFilterWidened = false;
  if (candidates.length === 0) {
    candidates = available.filter((c) => !taken.has(c.id));
    roleFilterWidened = true;
  }

  const ranked: { c: Champion; v: number }[] = [];

  for (const c of candidates) {
    const tier = player?.tiers[c.id] ?? null;
    const next = picks.slice();
    next[roleIdx] = { champ: c, tier, roleIdx };
    const delta = scoreComp(filled(next), profile).score - before;
    const bonus = tier ? AFFINITY_WEIGHT[tier] * 10 : 0;
    const malus = tier ? 0 : -6;
    const roleMalus = secondaryRoleMalus(c.id, slotRole);
    ranked.push({ c, v: delta + bonus + malus + roleMalus });
  }

  ranked.sort((a, b) => b.v - a.v);
  return {
    champions: ranked.slice(0, 5).map((x) => x.c),
    roleFilterWidened,
  };
}

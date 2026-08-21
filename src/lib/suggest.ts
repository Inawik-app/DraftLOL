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
): Champion[] {
  const taken = new Set<string>();
  for (const p of picks) {
    if (p) taken.add(p.champ.id);
  }

  const player = players[roleIdx];
  const before = scoreComp(filled(picks), profile).score;

  const ranked: { c: Champion; v: number }[] = [];

  for (const c of available) {
    if (taken.has(c.id)) continue;

    const tier = player?.tiers[c.id] ?? null;
    const next = picks.slice();
    next[roleIdx] = { champ: c, tier, roleIdx };
    const delta = scoreComp(filled(next), profile).score - before;
    const bonus = tier ? AFFINITY_WEIGHT[tier] * 10 : 0;
    const malus = tier ? 0 : -6;
    ranked.push({ c, v: delta + bonus + malus });
  }

  ranked.sort((a, b) => b.v - a.v);
  return ranked.slice(0, 5).map((x) => x.c);
}

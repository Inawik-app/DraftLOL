import { championIdFromKey, championKeyFromId } from "@/lib/ddragon";
import type { TierSeedLists } from "@/lib/tierSeed";
import { emptyTierSeedLists } from "@/lib/tierSeed";
import type { Champion, TierLabel } from "@/lib/types";

export type TierAssignments = Record<number, TierLabel>;

export function emptyTierLists(): TierSeedLists {
  return emptyTierSeedLists();
}

export function listsToAssignments(lists: TierSeedLists): TierAssignments {
  const out: TierAssignments = {};
  for (const key of lists.S) out[key] = "S";
  for (const key of lists.A) out[key] = "A";
  for (const key of lists.B) out[key] = "B";
  for (const key of lists.D) out[key] = "D";
  return out;
}

export function assignmentsToLists(assignments: TierAssignments): TierSeedLists {
  const lists = emptyTierLists();
  for (const [rawKey, tier] of Object.entries(assignments)) {
    const key = Number(rawKey);
    if (!Number.isInteger(key) || key < 0) continue;
    lists[tier].push(key);
  }
  for (const tier of ["S", "A", "B", "D"] as const) {
    lists[tier].sort((a, b) => a - b);
  }
  return lists;
}

/** Resolves numeric keys to champion ids for the current patch roster. */
export function tierListsToPlayerTiers(lists: TierSeedLists): Record<string, TierLabel> {
  const tiers: Record<string, TierLabel> = {};
  for (const key of lists.S) {
    const id = championIdFromKey(key);
    if (id) tiers[id] = "S";
  }
  for (const key of lists.A) {
    const id = championIdFromKey(key);
    if (id) tiers[id] = "A";
  }
  for (const key of lists.B) {
    const id = championIdFromKey(key);
    if (id) tiers[id] = "B";
  }
  for (const key of lists.D) {
    const id = championIdFromKey(key);
    if (id) tiers[id] = "D";
  }
  return tiers;
}

export function playerTiersToTierLists(
  tiers: Record<string, TierLabel>,
): TierSeedLists {
  const assignments: TierAssignments = {};
  for (const [id, tier] of Object.entries(tiers)) {
    const key = championKeyFromId(id);
    if (key == null) continue;
    assignments[key] = tier;
  }
  return assignmentsToLists(assignments);
}

export function nextTierLabel(tier: TierLabel): TierLabel | null {
  if (tier === "S") return "A";
  if (tier === "A") return "B";
  if (tier === "B") return "D";
  return null;
}

export function championsInLists(
  lists: TierSeedLists,
  championsByKey: Map<number, Champion>,
): Record<TierLabel, Champion[]> {
  const pick = (keys: number[]) =>
    keys
      .map((key) => championsByKey.get(key))
      .filter((c): c is Champion => c != null);
  return {
    S: pick(lists.S),
    A: pick(lists.A),
    B: pick(lists.B),
    D: pick(lists.D),
  };
}

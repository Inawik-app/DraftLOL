import { championIdFromKey } from "@/lib/ddragon";
import type { DraftRole } from "@/data/roles";
import { championPlaysRole } from "@/data/roles";
import type { TierSeedLists } from "@/lib/tierSeed";
import type { Champion } from "@/lib/types";
import { TIER_LABELS } from "@/lib/types";

export type ChampionGridEntry = {
  champion: Champion;
  /** Visual divider before this cell (boundary between tier pool and roster). */
  poolDividerBefore?: boolean;
};

/** Champion ids in tier-list order: S, then A, B, C — preserving list order within each tier. */
export function orderedChampionIdsFromTierLists(lists: TierSeedLists): string[] {
  const out: string[] = [];
  for (const tier of TIER_LABELS) {
    for (const key of lists[tier]) {
      const id = championIdFromKey(key);
      if (id) out.push(id);
    }
  }
  return out;
}

/**
 * Role filter for the champion grid: keep champs that play the role, plus any
 * champ still in the active ally tier pool (even off-role).
 */
export function matchesGridRoleFilter(
  championId: string,
  role: DraftRole,
  tierPoolIds: ReadonlySet<string> | null,
): boolean {
  if (championPlaysRole(championId, role)) return true;
  return tierPoolIds?.has(championId) ?? false;
}

/**
 * Reorders a filtered champion list: tier pool first (S→A→B→C, list order within tier),
 * then the rest in the input order (alphabetical roster by default).
 */
export function orderChampionsForGrid(
  champions: Champion[],
  tierPoolOrder: string[] | undefined,
  prioritizeTierPool: boolean,
): ChampionGridEntry[] {
  if (!prioritizeTierPool || !tierPoolOrder?.length) {
    return champions.map((champion) => ({ champion }));
  }

  const byId = new Map(champions.map((c) => [c.id, c]));
  const poolSet = new Set(tierPoolOrder);
  const pool: Champion[] = [];
  for (const id of tierPoolOrder) {
    const champ = byId.get(id);
    if (champ) pool.push(champ);
  }

  const rest = champions.filter((c) => !poolSet.has(c.id));
  if (pool.length === 0) {
    return champions.map((champion) => ({ champion }));
  }

  const out: ChampionGridEntry[] = pool.map((champion) => ({ champion }));
  if (rest.length > 0) {
    out.push({ champion: rest[0]!, poolDividerBefore: true });
    for (let i = 1; i < rest.length; i++) {
      out.push({ champion: rest[i]! });
    }
  }
  return out;
}

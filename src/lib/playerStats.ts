import type { ChampStats } from "./types";

export function parsePlayerStats(
  raw: string,
): { ok: true; stats: Record<string, ChampStats> } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, stats: {} };
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return { ok: false };
    }
    return { ok: true, stats: parsed as Record<string, ChampStats> };
  } catch {
    return { ok: false };
  }
}

export type MatchupInfo = {
  wr: number;
  vsName: string;
  games?: number;
  weakSample: boolean;
};

export function matchupFromStats(
  stats: Record<string, ChampStats> | undefined,
  champId: string,
  enemyId: string | undefined,
  enemyName: string | undefined,
): MatchupInfo | null {
  if (!enemyId || !enemyName || !stats) return null;
  const st = stats[champId];
  const wr = st?.vs?.[enemyId];
  if (wr == null) return null;
  const games = st.games;
  return {
    wr,
    vsName: enemyName,
    games,
    weakSample: games == null || games < 15,
  };
}

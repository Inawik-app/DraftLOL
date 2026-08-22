import type { ProfileKey } from "@/data/profiles";
import { ROLES_BY_INDEX, type DraftRole } from "@/data/roles";
import { PROFILES } from "@/data/profiles";
import type { TeamPickIds } from "./room";

export type LockScope = "both" | "ally";
export type GameResult = "win" | "loss" | null;

export type SeriesGamePick = { role: DraftRole; championId: string };

export type SeriesGame = {
  n: number;
  playedAt: string;
  profileKey: string;
  blue: SeriesGamePick[];
  red: SeriesGamePick[];
  result: GameResult;
};

export type SeriesState = {
  active: boolean;
  gameNumber: number;
  lockScope: LockScope;
  games: SeriesGame[];
};

export const EMPTY_SERIES: SeriesState = {
  active: false,
  gameNumber: 1,
  lockScope: "both",
  games: [],
};

const VALID_ROLES = new Set<DraftRole>(ROLES_BY_INDEX);
const VALID_RESULTS = new Set<GameResult>(["win", "loss", null]);
const VALID_SCOPES = new Set<LockScope>(["both", "ally"]);

function isProfileKey(value: string): value is ProfileKey {
  return Object.prototype.hasOwnProperty.call(PROFILES, value);
}

function normalizeGamePick(raw: unknown): SeriesGamePick | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as { role?: unknown; championId?: unknown };
  if (typeof obj.role !== "string" || typeof obj.championId !== "string") {
    return null;
  }
  if (!VALID_ROLES.has(obj.role as DraftRole) || !obj.championId) return null;
  return { role: obj.role as DraftRole, championId: obj.championId };
}

function normalizeGamePicks(raw: unknown): SeriesGamePick[] {
  if (!Array.isArray(raw)) return [];
  const out: SeriesGamePick[] = [];
  for (const item of raw) {
    const pick = normalizeGamePick(item);
    if (pick) out.push(pick);
  }
  return out;
}

function normalizeGame(raw: unknown): SeriesGame | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as {
    n?: unknown;
    playedAt?: unknown;
    profileKey?: unknown;
    blue?: unknown;
    red?: unknown;
    result?: unknown;
  };
  if (typeof obj.n !== "number" || obj.n < 1) return null;
  if (typeof obj.playedAt !== "string") return null;
  const profileKey =
    typeof obj.profileKey === "string" && isProfileKey(obj.profileKey)
      ? obj.profileKey
      : "teamfight";
  const result = obj.result ?? null;
  if (!VALID_RESULTS.has(result as GameResult)) return null;
  return {
    n: obj.n,
    playedAt: obj.playedAt,
    profileKey,
    blue: normalizeGamePicks(obj.blue),
    red: normalizeGamePicks(obj.red),
    result: result as GameResult,
  };
}

export function normalizeSeries(raw: unknown): SeriesState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_SERIES };
  }
  const obj = raw as {
    active?: unknown;
    gameNumber?: unknown;
    lockScope?: unknown;
    games?: unknown;
  };
  const lockScope =
    typeof obj.lockScope === "string" &&
    VALID_SCOPES.has(obj.lockScope as LockScope)
      ? (obj.lockScope as LockScope)
      : "both";
  const games: SeriesGame[] = [];
  if (Array.isArray(obj.games)) {
    for (const item of obj.games) {
      const game = normalizeGame(item);
      if (game) games.push(game);
    }
  }
  games.sort((a, b) => a.n - b.n);
  const active = obj.active === true;
  let gameNumber =
    typeof obj.gameNumber === "number" && obj.gameNumber >= 1
      ? Math.floor(obj.gameNumber)
      : 1;
  if (active && games.length > 0) {
    gameNumber = Math.max(gameNumber, games[games.length - 1]!.n + 1);
  }
  return { active, gameNumber, lockScope, games };
}

export function picksToGameEntries(pickIds: TeamPickIds): {
  blue: SeriesGamePick[];
  red: SeriesGamePick[];
} {
  const toEntries = (team: string[]): SeriesGamePick[] => {
    const out: SeriesGamePick[] = [];
    for (let i = 0; i < team.length; i++) {
      const id = team[i];
      if (!id) continue;
      out.push({ role: ROLES_BY_INDEX[i]!, championId: id });
    }
    return out;
  };
  return {
    blue: toEntries(pickIds.blue),
    red: toEntries(pickIds.red),
  };
}

/** championId -> game number for fearless locks from archived games only. */
export function computeLockedChampions(series: SeriesState): Map<string, number> {
  const locked = new Map<string, number>();
  if (!series.active && series.games.length === 0) return locked;

  for (const game of series.games) {
    const teams =
      series.lockScope === "both" ? [game.blue, game.red] : [game.blue];
    for (const picks of teams) {
      for (const pick of picks) {
        locked.set(pick.championId, game.n);
      }
    }
  }
  return locked;
}

export function lockedChampionsByGame(series: SeriesState): Map<number, string[]> {
  const byGame = new Map<number, string[]>();
  for (const game of series.games) {
    const teams =
      series.lockScope === "both" ? [game.blue, game.red] : [game.blue];
    const ids = new Set<string>();
    for (const picks of teams) {
      for (const pick of picks) {
        ids.add(pick.championId);
      }
    }
    byGame.set(game.n, [...ids]);
  }
  return byGame;
}

export function startSeries(): SeriesState {
  return {
    active: true,
    gameNumber: 1,
    lockScope: "both",
    games: [],
  };
}

export function archiveCurrentGame(
  series: SeriesState,
  pickIds: TeamPickIds,
  profileKey: ProfileKey,
  result: GameResult,
): SeriesState {
  const { blue, red } = picksToGameEntries(pickIds);
  const game: SeriesGame = {
    n: series.gameNumber,
    playedAt: new Date().toISOString(),
    profileKey,
    blue,
    red,
    result,
  };
  return {
    ...series,
    active: true,
    gameNumber: series.gameNumber + 1,
    games: [...series.games, game],
  };
}

export function endSeriesState(): SeriesState {
  return { ...EMPTY_SERIES };
}

export type SeriesExportPayload = {
  v: 1;
  exportedAt: string;
  series: SeriesState;
};

export function buildSeriesExport(series: SeriesState): SeriesExportPayload {
  return {
    v: 1,
    exportedAt: new Date().toISOString(),
    series,
  };
}

export function parseSeriesImport(raw: unknown): SeriesState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Fichier de série illisible.");
  }
  const obj = raw as { v?: unknown; series?: unknown };
  if (obj.v !== 1 || !obj.series) {
    throw new Error("Format de série non reconnu.");
  }
  const series = normalizeSeries(obj.series);
  if (!series.active && series.games.length === 0) {
    throw new Error("Le fichier ne contient aucune game archivée.");
  }
  return series;
}

export function seriesExportFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `draft-serie-${y}-${m}-${d}.json`;
}

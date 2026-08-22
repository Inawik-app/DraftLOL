import { isLocalStorageAvailable } from "@/lib/storage";
import type { ChampStats } from "@/lib/types";

const STATS_KEY = "draftboard.playerStats.v1";
const MY_ROLE_KEY = "draftboard.myRole.v1";

function readJson<T>(key: string): T | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadMyRoleIndex(): number | null {
  const n = readJson<number>(MY_ROLE_KEY);
  if (typeof n === "number" && n >= 0 && n <= 4) return n;
  return null;
}

export function saveMyRoleIndex(index: number): boolean {
  return writeJson(MY_ROLE_KEY, index);
}

type StatsStore = Record<string, Record<string, ChampStats>>;

function loadStatsStore(): StatsStore {
  return readJson<StatsStore>(STATS_KEY) ?? {};
}

export function loadPlayerStats(
  roleIndex: number,
): Record<string, ChampStats> {
  const store = loadStatsStore();
  const row = store[String(roleIndex)];
  return row && typeof row === "object" ? { ...row } : {};
}

export function savePlayerStats(
  roleIndex: number,
  stats: Record<string, ChampStats>,
): boolean {
  const store = loadStatsStore();
  store[String(roleIndex)] = stats;
  return writeJson(STATS_KEY, store);
}

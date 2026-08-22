import { isLocalStorageAvailable } from "@/lib/storage";
import { type SeriesState, normalizeSeries } from "./series";

const LAST_SERIES_KEY = "draftboard.lastSeries.v1";

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

export function saveLastTerminatedSeries(series: SeriesState): boolean {
  if (series.games.length === 0) return false;
  return writeJson(LAST_SERIES_KEY, series);
}

export function loadLastTerminatedSeries(): SeriesState | null {
  const raw = readJson<unknown>(LAST_SERIES_KEY);
  if (!raw) return null;
  const series = normalizeSeries(raw);
  if (series.games.length === 0) return null;
  return series;
}

export function clearLastTerminatedSeries(): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.removeItem(LAST_SERIES_KEY);
  } catch {
    /* ignore */
  }
}

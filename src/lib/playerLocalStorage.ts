import {
  emptyRoleProfiles,
  isOpggRegion,
  type OpggRegion,
  type RoleProfile,
} from "@/lib/opggLink";
import { isLocalStorageAvailable } from "@/lib/storage";

const ALLY_PROFILES_KEY = "draftboard.allyProfiles.v1";
const OPPONENT_PROFILES_KEY = "draftboard.opponentProfiles.v1";
const MY_ROLE_KEY = "draftboard.myRole.v1";
const OPGG_REGION_KEY = "draftboard.opggRegion.v1";

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

function normalizeProfileRow(raw: unknown): RoleProfile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { name: "", opgg: "" };
  }
  const row = raw as { name?: unknown; opgg?: unknown };
  return {
    name: typeof row.name === "string" ? row.name : "",
    opgg: typeof row.opgg === "string" ? row.opgg : "",
  };
}

function normalizeProfileList(raw: unknown): RoleProfile[] {
  const base = emptyRoleProfiles();
  if (!Array.isArray(raw)) return base;
  return base.map((fallback, i) => normalizeProfileRow(raw[i] ?? fallback));
}

export function loadMyRoleIndex(): number | null {
  const n = readJson<number>(MY_ROLE_KEY);
  if (typeof n === "number" && n >= 0 && n <= 4) return n;
  return null;
}

export function saveMyRoleIndex(index: number): boolean {
  return writeJson(MY_ROLE_KEY, index);
}

export function loadOpggRegion(): OpggRegion {
  const raw = readJson<string>(OPGG_REGION_KEY);
  if (raw && isOpggRegion(raw)) return raw;
  return "EUW";
}

export function saveOpggRegion(region: OpggRegion): boolean {
  return writeJson(OPGG_REGION_KEY, region);
}

export function loadAllyProfiles(): RoleProfile[] {
  return normalizeProfileList(readJson(ALLY_PROFILES_KEY));
}

export function saveAllyProfiles(profiles: RoleProfile[]): boolean {
  return writeJson(ALLY_PROFILES_KEY, normalizeProfileList(profiles));
}

export function loadOpponentProfiles(): RoleProfile[] {
  return normalizeProfileList(readJson(OPPONENT_PROFILES_KEY));
}

export function saveOpponentProfiles(profiles: RoleProfile[]): boolean {
  return writeJson(OPPONENT_PROFILES_KEY, normalizeProfileList(profiles));
}

export function clearOpponentProfiles(): boolean {
  return saveOpponentProfiles(emptyRoleProfiles());
}

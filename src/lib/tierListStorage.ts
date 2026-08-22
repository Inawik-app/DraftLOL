import type { TierSeedLists } from "@/lib/tierSeed";
import { isLocalStorageAvailable } from "@/lib/storage";

export const TIER_LIST_STORAGE_KEY = "draftboard.tierlist.v1";

type StoredTierList = {
  v: 1;
  lists: TierSeedLists;
};

export function loadTierListFromStorage(): TierSeedLists | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(TIER_LIST_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredTierList;
    if (data?.v !== 1 || !data.lists) return null;
    const lists = data.lists as TierSeedLists & { D?: number[] };
    return {
      S: Array.isArray(lists.S) ? lists.S : [],
      A: Array.isArray(lists.A) ? lists.A : [],
      B: Array.isArray(lists.B) ? lists.B : [],
      C: Array.isArray(lists.C)
        ? lists.C
        : Array.isArray(lists.D)
          ? lists.D
          : [],
    };
  } catch {
    return null;
  }
}

export function saveTierListToStorage(lists: TierSeedLists): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    const payload: StoredTierList = { v: 1, lists };
    window.localStorage.setItem(TIER_LIST_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearTierListStorage(): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    window.localStorage.removeItem(TIER_LIST_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export const TIER_LIST_STORAGE_UNAVAILABLE_MSG =
  "Impossible d'enregistrer la tier list localement (navigation privée ou stockage bloqué). Exporte régulièrement ta seed TL1.";

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignmentsToLists,
  listsToAssignments,
  nextTierLabel,
} from "./tierList";

describe("tierList assignments", () => {
  it("aller-retour assignments ↔ lists", () => {
    const assignments = { 103: "S" as const, 266: "A" as const, 12: "B" as const };
    const lists = assignmentsToLists(assignments);
    expect(listsToAssignments(lists)).toEqual(assignments);
  });

  it("nextTierLabel cycle S → A → B → D → null", () => {
    expect(nextTierLabel("S")).toBe("A");
    expect(nextTierLabel("A")).toBe("B");
    expect(nextTierLabel("B")).toBe("D");
    expect(nextTierLabel("D")).toBeNull();
  });
});

describe("tierListStorage", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    const ls = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: () => null,
      get length() {
        return store.size;
      },
    };
    vi.stubGlobal("localStorage", ls);
    vi.stubGlobal("window", { localStorage: ls });
  });

  it("save et load une tier list versionnée", async () => {
    const { saveTierListToStorage, loadTierListFromStorage, TIER_LIST_STORAGE_KEY } =
      await import("./tierListStorage");
    const lists = { S: [103], A: [266], B: [], D: [] };
    expect(saveTierListToStorage(lists)).toBe(true);
    expect(loadTierListFromStorage()).toEqual(lists);
    expect(localStorage.getItem(TIER_LIST_STORAGE_KEY)).toContain('"v":1');
  });
});

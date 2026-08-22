import { describe, expect, it, beforeEach } from "vitest";
import { setChampionCatalog } from "@/lib/room";
import { orderChampionsForGrid } from "@/lib/championGridOrder";
import type { Champion } from "@/lib/types";

function mockChamp(id: string, key: number, name: string): Champion {
  return {
    id,
    key,
    name,
    title: "",
    tags: [],
    curated: true,
    riotTags: [],
  };
}

/** Minimal ADC tier pool + extra roster champs for ordering tests. */
function adcTierPoolScenario() {
  const tierPoolOrder = ["Jinx", "Ashe", "Caitlyn", "Varus"];
  const roster = [
    mockChamp("Ahri", 103, "Ahri"),
    mockChamp("Ashe", 22, "Ashe"),
    mockChamp("Caitlyn", 51, "Caitlyn"),
    mockChamp("Jinx", 222, "Jinx"),
    mockChamp("Varus", 110, "Varus"),
    mockChamp("Zed", 238, "Zed"),
  ].sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return { tierPoolOrder, roster };
}

describe("orderChampionsForGrid", () => {
  beforeEach(() => {
    setChampionCatalog([
      mockChamp("Ashe", 22, "Ashe"),
      mockChamp("Caitlyn", 51, "Caitlyn"),
      mockChamp("Jinx", 222, "Jinx"),
      mockChamp("Varus", 110, "Varus"),
    ]);
  });

  it("ADC slot: tier pool first (S then A then B), then alphabetical roster", () => {
    const { tierPoolOrder, roster } = adcTierPoolScenario();

    const entries = orderChampionsForGrid(roster, tierPoolOrder, true);
    const ids = entries.map((e) => e.champion.id);

    expect(ids.slice(0, tierPoolOrder.length)).toEqual(tierPoolOrder);
    expect(ids.slice(tierPoolOrder.length)).toEqual(["Ahri", "Zed"]);
    expect(entries[tierPoolOrder.length]?.poolDividerBefore).toBe(true);
  });

  it("sans priorisation tier pool, conserve l'ordre d'entrée", () => {
    const { tierPoolOrder, roster } = adcTierPoolScenario();
    const entries = orderChampionsForGrid(roster, tierPoolOrder, false);
    expect(entries.map((e) => e.champion.id)).toEqual(roster.map((c) => c.id));
  });

  it("pool vide ne réordonne pas", () => {
    const roster = adcTierPoolScenario().roster;
    const entries = orderChampionsForGrid(roster, [], true);
    expect(entries.map((e) => e.champion.id)).toEqual(roster.map((c) => c.id));
  });
});

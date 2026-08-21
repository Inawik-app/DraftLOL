import { describe, expect, it } from "vitest";
import { parsePlayerStats } from "./playerStats";

describe("parsePlayerStats", () => {
  it("accepte un objet valide", () => {
    const r = parsePlayerStats(
      '{"Ahri":{"games":42,"wr":57,"vs":{"Zed":45}}}',
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.stats.Ahri?.games).toBe(42);
      expect(r.stats.Ahri?.vs?.Zed).toBe(45);
    }
  });

  it("chaîne vide → stats vides", () => {
    expect(parsePlayerStats("")).toEqual({ ok: true, stats: {} });
    expect(parsePlayerStats("   ")).toEqual({ ok: true, stats: {} });
  });

  it("texte libre → échec sans throw", () => {
    expect(() => parsePlayerStats("pas du json")).not.toThrow();
    expect(parsePlayerStats("pas du json").ok).toBe(false);
  });

  it("un tableau à la place d'un objet → échec", () => {
    expect(parsePlayerStats("[1,2,3]").ok).toBe(false);
  });

  it("null JSON → échec", () => {
    expect(parsePlayerStats("null").ok).toBe(false);
  });
});

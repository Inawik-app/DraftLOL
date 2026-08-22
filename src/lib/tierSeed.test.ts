import { describe, expect, it } from "vitest";
import { encodeTierSeed, decodeTierSeed } from "./tierSeed";

describe("encodeTierSeed / decodeTierSeed", () => {
  it("aller-retour sur quatre listes", () => {
    const lists = { S: [266, 103], A: [51, 777], B: [12], C: [222] };
    const seed = encodeTierSeed(lists);
    expect(seed.startsWith("TL1.")).toBe(true);
    const decoded = decodeTierSeed(seed);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.lists).toEqual({
      S: [103, 266],
      A: [51, 777],
      B: [12],
      C: [222],
    });
  });

  it("compatibilité seeds TL1 à trois listes (sans C)", () => {
    const decoded = decodeTierSeed("TL1.||");
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.lists).toEqual({ S: [], A: [], B: [], C: [] });
  });

  it("listes vides", () => {
    const seed = encodeTierSeed({ S: [], A: [], B: [], C: [] });
    expect(seed).toBe("TL1.|||");
    const decoded = decodeTierSeed(seed);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.lists).toEqual({ S: [], A: [], B: [], C: [] });
  });

  it("moins de 60 caractères pour 30 champions", () => {
    const keys = Array.from({ length: 30 }, (_, i) => (i + 1) * 17);
    const seed = encodeTierSeed({
      S: keys.slice(0, 10),
      A: keys.slice(10, 20),
      B: keys.slice(20, 30),
      C: [],
    });
    expect(seed.length).toBeLessThan(60);
    const decoded = decodeTierSeed(seed);
    expect(decoded.ok).toBe(true);
  });

  it("decodeTierSeed ne jette jamais", () => {
    for (const junk of ["", "TL1.", "TL1.a|b", "pas-un-seed", "TL1.%zz|x|y"]) {
      expect(() => decodeTierSeed(junk)).not.toThrow();
      const r = decodeTierSeed(junk);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason.length).toBeGreaterThan(0);
    }
  });

  it("retourne une raison en français si le préfixe est absent", () => {
    const r = decodeTierSeed("DRAFT1.abc");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/TL1|préfixe/i);
  });
});

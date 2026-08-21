import { describe, expect, it } from "vitest";
import { subsequenceScore } from "./search";

describe("subsequenceScore", () => {
  it('trouve Kassadin avec "kss"', () => {
    expect(subsequenceScore("kss", "Kassadin")).not.toBeNull();
  });

  it('trouve Morgana avec "mrgn"', () => {
    expect(subsequenceScore("mrgn", "Morgana")).not.toBeNull();
  });

  it('trouve Twisted Fate avec "twf"', () => {
    expect(subsequenceScore("twf", "Twisted Fate")).not.toBeNull();
  });

  it('ne trouve rien avec "zzz"', () => {
    expect(subsequenceScore("zzz", "Kassadin")).toBeNull();
    expect(subsequenceScore("zzz", "Lee Sin")).toBeNull();
    expect(subsequenceScore("zzz", "Ahri")).toBeNull();
  });

  it('"lee" classe Lee Sin devant les autres', () => {
    const candidates = [
      "Lee Sin",
      "Leblanc",
      "Leona",
      "Master Yi",
      "Riven",
      "Nasus",
    ];
    const ranked = candidates
      .map((name) => ({ name, score: subsequenceScore("lee", name) }))
      .filter((x) => x.score !== null)
      .sort((a, b) => (b.score as number) - (a.score as number));

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].name).toBe("Lee Sin");
  });

  it("une requête vide retourne 0 pour tout nom", () => {
    expect(subsequenceScore("", "Kassadin")).toBe(0);
    expect(subsequenceScore("", "Kai'Sa")).toBe(0);
    expect(subsequenceScore("   ", "Ahri")).toBe(0);
  });

  it("trouve Kai'Sa avec kaisa", () => {
    expect(subsequenceScore("kaisa", "Kai'Sa")).not.toBeNull();
  });
});

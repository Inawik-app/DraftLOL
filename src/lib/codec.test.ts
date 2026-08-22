import { describe, expect, it } from "vitest";
import { packChampionKeys, unpackChampionKeys } from "./codec";

describe("packChampionKeys / unpackChampionKeys", () => {
  it("aller-retour sur une liste vide", () => {
    expect(packChampionKeys([])).toBe("");
    expect(unpackChampionKeys("")).toEqual([]);
    expect(unpackChampionKeys(packChampionKeys([]))).toEqual([]);
  });

  it("aller-retour sur un élément", () => {
    const packed = packChampionKeys([266]);
    expect(packed.length).toBeGreaterThan(0);
    expect(unpackChampionKeys(packed)).toEqual([266]);
  });

  it("aller-retour sur 170 éléments", () => {
    const keys = Array.from({ length: 170 }, (_, i) => i * 5 + 1);
    const packed = packChampionKeys(keys);
    expect(unpackChampionKeys(packed)).toEqual(keys);
  });

  it("trie et déduplique une entrée non triée", () => {
    const packed = packChampionKeys([103, 266, 103, 51, 12]);
    expect(unpackChampionKeys(packed)).toEqual([12, 51, 103, 266]);
  });

  it("chaîne corrompue retourne un tableau vide sans jeter", () => {
    expect(() => unpackChampionKeys("!!!not-base64url!!!")).not.toThrow();
    expect(unpackChampionKeys("!!!not-base64url!!!")).toEqual([]);
    const packed = packChampionKeys([1000, 2000, 3000]);
    expect(unpackChampionKeys(packed.slice(0, -1))).toEqual([]);
    const corruptVarint =
      typeof Buffer !== "undefined"
        ? Buffer.from([0x80]).toString("base64url")
        : "gA";
    expect(unpackChampionKeys(corruptVarint)).toEqual([]);
  });
});

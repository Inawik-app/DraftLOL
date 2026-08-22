import { afterEach, describe, expect, it } from "vitest";
import {
  base64urlToBytes,
  bytesToBase64url,
  packChampionKeys,
  unpackChampionKeys,
} from "./codec";

describe("bytesToBase64url / base64urlToBytes", () => {
  it("aller-retour sur des octets arbitraires", () => {
    const bytes = new Uint8Array([0, 1, 127, 255, 42, 99]);
    expect(base64urlToBytes(bytesToBase64url(bytes))).toEqual(bytes);
  });

  it("chaîne vide ↔ tableau vide", () => {
    expect(bytesToBase64url(new Uint8Array(0))).toBe("");
    expect(base64urlToBytes("")).toEqual(new Uint8Array(0));
  });

  it("fonctionne sans Buffer global (environnement navigateur)", () => {
    const prev = globalThis.Buffer;
    // @ts-expect-error — simulate browser without Node Buffer
    delete globalThis.Buffer;
    try {
      const bytes = new Uint8Array([0x80, 0x01]);
      const encoded = bytesToBase64url(bytes);
      expect(encoded).not.toContain("+");
      expect(encoded).not.toContain("/");
      expect(base64urlToBytes(encoded)).toEqual(bytes);
      expect(unpackChampionKeys(packChampionKeys([266, 103]))).toEqual([
        103, 266,
      ]);
    } finally {
      globalThis.Buffer = prev;
    }
  });
});

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

  it("rejette une clé non entière", () => {
    expect(() => packChampionKeys([266.5])).toThrow(/entier/);
    expect(() => packChampionKeys([-1])).toThrow(/entier/);
    expect(() => packChampionKeys([NaN])).toThrow(/entier/);
  });

  it("chaîne corrompue retourne un tableau vide sans jeter", () => {
    expect(() => unpackChampionKeys("!!!not-base64url!!!")).not.toThrow();
    expect(unpackChampionKeys("!!!not-base64url!!!")).toEqual([]);
    const packed = packChampionKeys([1000, 2000, 3000]);
    expect(unpackChampionKeys(packed.slice(0, -1))).toEqual([]);
    expect(unpackChampionKeys(bytesToBase64url(new Uint8Array([0x80])))).toEqual(
      [],
    );
  });
});

describe("packChampionKeys sans Buffer", () => {
  const saved = globalThis.Buffer;

  afterEach(() => {
    globalThis.Buffer = saved;
  });

  it("encode et decode sans polyfill Buffer", () => {
    // @ts-expect-error — browser-like environment
    delete globalThis.Buffer;
    const keys = [12, 51, 103, 266];
    expect(unpackChampionKeys(packChampionKeys(keys))).toEqual(keys);
  });
});

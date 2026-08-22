import { describe, expect, it } from "vitest";
import { encodeRoom, extractToken, type RoomState } from "./token";
import type { Champion } from "./types";

function champ(id: string, key: number, name = id): Champion {
  return {
    id,
    key,
    name,
    title: "titre",
    tags: ["ad"],
    curated: true,
    riotTags: [],
  };
}

function minimalState(): RoomState {
  return {
    profileKey: "teamfight",
    picks: { blue: [null, null, null, null, null], red: [null, null, null, null, null] },
    bans: { blue: ["", "", "", "", ""], red: ["", "", "", "", ""] },
    players: [0, 1, 2, 3, 4].map(() => ({
      name: "",
      opgg: "",
      tiers: {},
    })),
  };
}

describe("extractToken", () => {
  const token = encodeRoom(minimalState());

  it("1 — token nu DRAFT1.xxx", () => {
    expect(extractToken(token)).toBe(token);
  });

  it("2 — URL complète https://exemple.com/#r=DRAFT1.xxx", () => {
    expect(extractToken(`https://exemple.com/#r=${token}`)).toBe(token);
  });

  it("3 — fragment seul #r=DRAFT1.xxx", () => {
    expect(extractToken(`#r=${token}`)).toBe(token);
  });

  it("4 — espaces et retours à la ligne autour", () => {
    expect(extractToken(`  \n ${token} \r\n `)).toBe(token);
  });

  it("5 — guillemets autour", () => {
    expect(extractToken(`"${token}"`)).toBe(token);
    expect(extractToken(`'${token}'`)).toBe(token);
  });

  it("6 — point final collé", () => {
    expect(extractToken(`${token}.`)).toBe(token);
  });

  it("accepte aussi TL1.xxx", () => {
    const tl = "TL1.abc|def|ghi";
    expect(extractToken(`https://draft.board/#r=${tl}`)).toBe(tl);
  });

  it("legacy hash sans r=", () => {
    expect(extractToken(`#${token}`)).toBe(token);
  });

  it("retourne null sans préfixe connu", () => {
    expect(extractToken("bonjour")).toBeNull();
    expect(extractToken("")).toBeNull();
  });
});

void champ;

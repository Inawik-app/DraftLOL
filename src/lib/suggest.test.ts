import { describe, expect, it } from "vitest";
import { PROFILES } from "@/data/profiles";
import { championPlaysRole } from "@/data/roles";
import { suggestForRole } from "./suggest";
import type { Champion, Pick, Player, Tag } from "./types";

function champ(id: string, tags: Tag[], key = id.length * 10): Champion {
  return {
    id,
    key,
    name: id,
    title: "",
    tags,
    curated: true,
    riotTags: [],
  };
}

function emptyPlayers(): Player[] {
  return [0, 1, 2, 3, 4].map(() => ({
    name: "",
    opgg: "",
    tiers: {},
  }));
}

function emptySlots(): (Pick | null)[] {
  return [null, null, null, null, null];
}

describe("suggestForRole", () => {
  const profile = PROFILES.teamfight;

  it("un tier S hors profil passe devant un sans-tier légèrement mieux adapté", () => {
    const fit = champ("FitChamp", ["utility"]);
    const off = champ("OffChamp", ["splitpush", "mobility"]);

    const players = emptyPlayers();
    players[0] = {
      ...players[0],
      tiers: { OffChamp: "S" },
    };

    const result = suggestForRole(
      0,
      emptySlots(),
      profile,
      players,
      [fit, off],
    );

    expect(result.champions[0]?.id).toBe("OffChamp");
  });

  it("un champion banni n'apparaît jamais", () => {
    const ok = champ("OkOne", ["ap", "utility"]);
    const result = suggestForRole(
      0,
      emptySlots(),
      profile,
      emptyPlayers(),
      [ok],
    );
    expect(result.champions.find((c) => c.id === "BannedOne")).toBeUndefined();
  });

  it("exclut un champion déjà pris même s'il est encore dans available", () => {
    const taken = champ("Taken", ["frontline", "dps", "ad"]);
    const free = champ("Free", ["ap", "utility", "waveclear"]);
    const slots = emptySlots();
    slots[1] = { champ: taken, tier: null, roleIdx: 1 };

    const result = suggestForRole(0, slots, profile, emptyPlayers(), [
      taken,
      free,
    ]);
    expect(result.champions.map((c) => c.id)).not.toContain("Taken");
    expect(result.champions.map((c) => c.id)).toContain("Free");
  });

  it("ne dépasse jamais cinq éléments", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      champ(`C${i}`, ["ad", "dps"]),
    );
    const result = suggestForRole(
      0,
      emptySlots(),
      profile,
      emptyPlayers(),
      many,
    );
    expect(result.champions.length).toBeLessThanOrEqual(5);
  });

  it("un pool de joueur vide retourne quand même des suggestions", () => {
    const pool = [
      champ("A", ["frontline", "engage", "ad"]),
      champ("B", ["ap", "waveclear", "utility"]),
      champ("C", ["dps", "ad"]),
    ];
    const result = suggestForRole(
      2,
      emptySlots(),
      profile,
      emptyPlayers(),
      pool,
    );
    expect(result.champions.length).toBeGreaterThan(0);
    expect(result.champions.length).toBeLessThanOrEqual(5);
  });

  it("slot SUP n'inclut que des champions jouables sup", () => {
    const leeSin = champ("LeeSin", ["dps", "mobility"]);
    const thresh = champ("Thresh", ["utility", "engage"]);
    const lux = champ("Lux", ["ap", "utility", "waveclear"]);

    const result = suggestForRole(
      4,
      emptySlots(),
      profile,
      emptyPlayers(),
      [leeSin, thresh, lux],
    );

    expect(result.champions.length).toBeGreaterThan(0);
    for (const c of result.champions) {
      expect(championPlaysRole(c.id, "sup")).toBe(true);
    }
    expect(result.champions.map((c) => c.id)).not.toContain("LeeSin");
  });

  it("élargit au roster complet si aucun candidat ne correspond au rôle", () => {
    const onlyJgl = champ("LeeSin", ["dps", "mobility"]);
    const result = suggestForRole(
      4,
      emptySlots(),
      profile,
      emptyPlayers(),
      [onlyJgl],
    );
    expect(result.roleFilterWidened).toBe(true);
    expect(result.champions[0]?.id).toBe("LeeSin");
  });
});

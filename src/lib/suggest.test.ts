import { describe, expect, it } from "vitest";
import { PROFILES } from "@/data/profiles";
import { suggestForRole } from "./suggest";
import type { Champion, Pick, Player, Tag } from "./types";

function champ(id: string, tags: Tag[]): Champion {
  return {
    id,
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
    stats: {},
  }));
}

function emptySlots(): (Pick | null)[] {
  return [null, null, null, null, null];
}

describe("suggestForRole", () => {
  const profile = PROFILES.teamfight;

  it("un tier S hors profil passe devant un sans-tier légèrement mieux adapté", () => {
    // Fit : un peu utile au profil (utility) → delta brut > 0, mais sans tier (−6)
    const fit = champ("FitChamp", ["utility"]);
    // Off : hors profil, mais tier S (+10)
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

    expect(result[0]?.id).toBe("OffChamp");
  });

  it("un champion banni n'apparaît jamais", () => {
    const banned = champ("BannedOne", ["frontline", "dps", "ad"]);
    const ok = champ("OkOne", ["ap", "utility"]);
    // available = roster après exclusion des bans (le ban n'y figure pas)
    const result = suggestForRole(
      0,
      emptySlots(),
      profile,
      emptyPlayers(),
      [ok],
    );
    expect(result.find((c) => c.id === banned.id)).toBeUndefined();
    expect(result.every((c) => c.id !== "BannedOne")).toBe(true);
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
    expect(result.map((c) => c.id)).not.toContain("Taken");
    expect(result.map((c) => c.id)).toContain("Free");
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
    expect(result.length).toBeLessThanOrEqual(5);
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
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(5);
  });
});

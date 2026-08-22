import { describe, expect, it } from "vitest";
import { PROFILES } from "@/data/profiles";
import { championPlaysRole } from "@/data/roles";
import {
  EMPTY_SERIES,
  archiveCurrentGame,
  buildSeriesExport,
  computeLockedChampions,
  endSeriesState,
  parseSeriesImport,
  picksToGameEntries,
  startSeries,
} from "./series";
import { suggestForRole } from "./suggest";
import type { Champion, Pick, Player, Tag } from "./types";

function champ(id: string, tags: Tag[] = ["ad"]): Champion {
  return {
    id,
    key: id.length * 10,
    name: id,
    title: "",
    tags,
    curated: true,
    riotTags: [],
  };
}

function emptyPlayers(): Player[] {
  return [0, 1, 2, 3, 4].map(() => ({ name: "", opgg: "", tiers: {} }));
}

function emptySlots(): (Pick | null)[] {
  return [null, null, null, null, null];
}

describe("fearless series locks", () => {
  it("un champion joué en game 1 n'est pas proposé par suggestForRole en game 2", () => {
    let series = startSeries();
    series = archiveCurrentGame(
      series,
      {
        blue: ["Garen", "", "", "", ""],
        red: ["", "", "", "", ""],
      },
      "teamfight",
      "win",
    );
    expect(series.gameNumber).toBe(2);

    const locked = computeLockedChampions(series);
    expect(locked.has("Garen")).toBe(true);

    const pool = [champ("Garen"), champ("Darius"), champ("Sett")];
    const available = pool.filter((c) => !locked.has(c.id));
    const result = suggestForRole(
      0,
      emptySlots(),
      PROFILES.teamfight,
      emptyPlayers(),
      available,
    );

    expect(result.champions.map((c) => c.id)).not.toContain("Garen");
  });

  it('avec lockScope "ally", un champion rouge de game 1 reste disponible en game 2', () => {
    let series = startSeries();
    series = archiveCurrentGame(
      series,
      {
        blue: ["Garen", "", "", "", ""],
        red: ["LeeSin", "", "", "", ""],
      },
      "teamfight",
      "loss",
    );
    series = { ...series, lockScope: "ally" };

    const locked = computeLockedChampions(series);
    expect(locked.has("Garen")).toBe(true);
    expect(locked.has("LeeSin")).toBe(false);
  });

  it("les bans de la game 1 n'apparaissent pas dans les verrous", () => {
    const entries = picksToGameEntries({
      blue: ["Garen", "", "", "", ""],
      red: ["", "", "", "", ""],
    });
    expect(entries.blue.some((p) => p.championId === "Yasuo")).toBe(false);

    let series = startSeries();
    series = archiveCurrentGame(
      series,
      {
        blue: ["Garen", "", "", "", ""],
        red: ["", "", "", "", ""],
      },
      "teamfight",
      null,
    );
    const locked = computeLockedChampions(series);
    expect(locked.has("Garen")).toBe(true);
    expect(locked.size).toBe(1);
  });

  it("Nouvelle draft pendant une série n'archive rien et ne modifie pas gameNumber", () => {
    let series = startSeries();
    const beforeNumber = series.gameNumber;
    const beforeGames = series.games.length;

    // Simule reset board sans archiveCurrentGame
    const afterResetSeries = { ...series };
    expect(afterResetSeries.gameNumber).toBe(beforeNumber);
    expect(afterResetSeries.games.length).toBe(beforeGames);
    expect(afterResetSeries.active).toBe(true);
  });

  it("aller-retour export puis import : verrous et historique identiques", () => {
    let series = startSeries();
    series = archiveCurrentGame(
      series,
      {
        blue: ["Ahri", "LeeSin", "", "", ""],
        red: ["Ashe", "", "", "", ""],
      },
      "teamfight",
      "win",
    );
    series = archiveCurrentGame(
      series,
      {
        blue: ["Garen", "", "", "", ""],
        red: ["", "", "", "", ""],
      },
      "teamfight",
      "loss",
    );

    const exported = buildSeriesExport(series);
    const restored = parseSeriesImport(exported);

    expect(restored).toEqual(series);
    expect(computeLockedChampions(restored)).toEqual(
      computeLockedChampions(series),
    );
  });

  it("endSeriesState remet la série à zéro", () => {
    let series = startSeries();
    series = archiveCurrentGame(
      series,
      { blue: ["Garen", "", "", "", ""], red: ["", "", "", "", ""] },
      "teamfight",
      "win",
    );
    expect(endSeriesState()).toEqual(EMPTY_SERIES);
  });

  it("parseSeriesImport rejette un fichier invalide", () => {
    expect(() => parseSeriesImport(null)).toThrow(
      "Fichier de série illisible.",
    );
    expect(() => parseSeriesImport({ v: 2, series: {} })).toThrow(
      "Format de série non reconnu.",
    );
  });

  it("les picks archivés conservent le rôle attendu", () => {
    const entries = picksToGameEntries({
      blue: ["", "LeeSin", "Ahri", "Ashe", "Thresh"],
      red: ["", "", "", "", ""],
    });
    expect(entries.blue.map((p) => p.role)).toEqual([
      "jgl",
      "mid",
      "adc",
      "sup",
    ]);
    for (const pick of entries.blue) {
      expect(championPlaysRole(pick.championId, pick.role)).toBe(true);
    }
  });
});

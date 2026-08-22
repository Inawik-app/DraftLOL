import { describe, expect, it } from "vitest";
import { PROFILES } from "@/data/profiles";
import { scoreComp } from "./score";
import {
  ALL_TAGS,
  type Champion,
  type Pick,
  type Tag,
  type TierLabel,
} from "./types";

function makeChamp(id: string, tags: Tag[], key = id.length * 10): Champion {
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

function makePick(
  tags: Tag[],
  roleIdx: number,
  tier: TierLabel | null = null,
): Pick {
  return {
    champ: makeChamp(`c${roleIdx}-${tags.join("-")}`, tags),
    tier,
    roleIdx,
  };
}

describe("scoreComp", () => {
  const teamfight = PROFILES.teamfight;

  it("compo vide : score 0, notes vides, jauges à have 0", () => {
    const ev = scoreComp([], teamfight);
    expect(ev.score).toBe(0);
    expect(ev.notes).toEqual([]);
    expect(ev.rows.length).toBe(Object.keys(teamfight.targets).length);
    for (const row of ev.rows) {
      expect(row.have).toBe(0);
    }
  });

  it("un pick parfait dans le profil dépasse 60 (échelle n/5)", () => {
    const perfectTags = Object.keys(teamfight.targets) as Tag[];
    const ev = scoreComp([makePick(perfectTags, 0)], teamfight);
    expect(ev.score).toBeGreaterThan(60);
  });

  it("cinq picks seulement ad : note bad AP et malus de 14", () => {
    const picks = [0, 1, 2, 3, 4].map((i) => makePick(["ad"], i));
    const ev = scoreComp(picks, teamfight);

    expect(
      ev.notes.some(
        (n) => n.t === "bad" && /ap|magique/i.test(n.m),
      ),
    ).toBe(true);

    const max = Object.values(teamfight.targets).reduce((s, t) => s + t, 0);
    const adTarget = teamfight.targets.ad!;
    const raw = (adTarget / max) * 100;
    // ad en high (−4), zéro ap (−14), zéro frontline (−10)
    expect(ev.base).toBeCloseTo(raw - 4 - 14 - 10, 10);
  });

  it("quatre picks sans frontline : note bad et malus de 10", () => {
    const picks = [
      makePick(["ad", "ap", "dps"], 0),
      makePick(["ad", "ap", "utility"], 1),
      makePick(["ad", "ap", "waveclear", "engage"], 2),
      makePick(["ad", "ap", "dps", "utility", "waveclear"], 3),
    ];
    const ev = scoreComp(picks, teamfight);

    expect(
      ev.notes.some((n) => n.t === "bad" && /frontline/i.test(n.m)),
    ).toBe(true);

    // n=4, ad et ap présents (pas de malus menace) ; ad et ap en high (−4×2)
    const scale = 4 / 5;
    const counts = { ad: 4, ap: 4, dps: 2, utility: 2, waveclear: 2, engage: 1, frontline: 0 };
    let got = 0;
    let max = 0;
    let highCount = 0;
    for (const [tag, target] of Object.entries(teamfight.targets) as [Tag, number][]) {
      const need = target * scale;
      const have = counts[tag as keyof typeof counts] ?? 0;
      max += target;
      got += Math.min(have / need, 1) * target;
      if (have > need + 1.2) highCount++;
    }
    const raw = (got / max) * 100;
    expect(ev.base).toBeCloseTo(raw - highCount * 4 - 10, 10);
  });

  it("excès > cible + 1.2 : statut high et malus de 4", () => {
    // need ad = 2 à n=5 ; have 4 > 2+1.2 → high
    const picks = [
      makePick(["ad", "ap", "frontline", "dps"], 0),
      makePick(["ad", "ap", "frontline", "dps"], 1),
      makePick(["ad", "ap", "engage", "utility"], 2),
      makePick(["ad", "utility", "waveclear"], 3),
      makePick(["waveclear"], 4),
    ];
    const ev = scoreComp(picks, teamfight);
    const adRow = ev.rows.find((r) => r.tag === "ad")!;
    expect(adRow.have).toBeGreaterThan(adRow.need + 1.2);
    expect(adRow.status).toBe("high");

    const highCount = ev.rows.filter((r) => r.status === "high").length;
    expect(highCount).toBeGreaterThanOrEqual(1);

    const max = Object.values(teamfight.targets).reduce((s, t) => s + t, 0);
    let got = 0;
    const counts = Object.fromEntries(ALL_TAGS.map((t) => [t, 0])) as Record<
      Tag,
      number
    >;
    for (const p of picks) {
      for (const t of p.champ.tags) counts[t]++;
    }
    for (const [tag, target] of Object.entries(teamfight.targets) as [
      Tag,
      number,
    ][]) {
      const need = target;
      const have = counts[tag] || 0;
      got += Math.min(have / need, 1) * target;
    }
    const raw = (got / max) * 100;
    // high −4 chacun ; ad et ap présents ; frontline présents
    expect(ev.base).toBeCloseTo(raw - highCount * 4, 10);
    expect(ev.notes.some((n) => n.t === "warn")).toBe(true);
  });

  it("6a — l'affinité départage à profil imparfait", () => {
    // base attendue ≈ 76.9 : assez de marge sous 100 pour que +12 reste visible
    const tagsList: Tag[][] = [
      ["frontline", "dps", "ad"],
      ["dps", "ad"],
      ["engage", "ap"],
      ["utility", "ap"],
      ["waveclear", "ad"],
    ];
    const withS = tagsList.map((tags, i) => makePick(tags, i, "S"));
    const without = tagsList.map((tags, i) => makePick(tags, i, null));
    const hi = scoreComp(withS, teamfight);
    const lo = scoreComp(without, teamfight);

    expect(hi.base).toBeGreaterThanOrEqual(60);
    expect(hi.base).toBeLessThanOrEqual(85);
    expect(hi.affinityBonus).toBeCloseTo(12, 10);
    expect(lo.affinityBonus).toBe(0);
    expect(hi.base).toBe(lo.base);
    expect(hi.score).toBeGreaterThan(lo.score);
    expect(hi.score - lo.score).toBeCloseTo(
      hi.affinityBonus - lo.affinityBonus,
      10,
    );
  });

  // Intentionnel : sans écart au profil, l'affinité n'a rien à compenser ;
  // le clamp à 100 absorbe le bonus — ce n'est pas un bug.
  it("6b — le plafond absorbe l'affinité sur une composition parfaite", () => {
    const tagsList: Tag[][] = [
      ["frontline", "dps", "ad"],
      ["frontline", "dps", "ad"],
      ["engage", "utility", "ap"],
      ["utility", "waveclear", "ap"],
      ["waveclear", "ad", "ap"],
    ];
    const withS = tagsList.map((tags, i) => makePick(tags, i, "S"));
    const without = tagsList.map((tags, i) => makePick(tags, i, null));
    const hi = scoreComp(withS, teamfight);
    const lo = scoreComp(without, teamfight);

    expect(hi.base).toBe(100);
    expect(lo.base).toBe(100);
    expect(hi.score).toBe(100);
    expect(lo.score).toBe(100);
    expect(hi.affinityBonus).toBeCloseTo(12, 10);
    expect(lo.affinityBonus).toBe(0);
  });

  it("garde-fou : équilibré sans affinité bat sans-frontline en tier S", () => {
    const balanced = [
      makePick(["frontline", "dps", "ad"], 0),
      makePick(["frontline", "dps", "ad"], 1),
      makePick(["engage", "utility", "ap"], 2),
      makePick(["utility", "waveclear", "ap"], 3),
      makePick(["waveclear", "ad", "ap"], 4),
    ];
    const noFrontlineS = [
      makePick(["dps", "ad"], 0, "S"),
      makePick(["dps", "ad"], 1, "S"),
      makePick(["engage", "utility", "ap"], 2, "S"),
      makePick(["utility", "waveclear", "ap"], 3, "S"),
      makePick(["waveclear", "ad", "ap"], 4, "S"),
    ];
    const bal = scoreComp(balanced, teamfight);
    const nfs = scoreComp(noFrontlineS, teamfight);
    expect(bal.affinityBonus).toBe(0);
    expect(nfs.affinityBonus).toBeCloseTo(12, 10);
    expect(bal.score).toBeGreaterThan(nfs.score);
  });

  it("sur 100 compos aléatoires, score dans [0, 100]", () => {
    for (let i = 0; i < 100; i++) {
      const n = Math.floor(Math.random() * 6);
      const picks: Pick[] = [];
      for (let r = 0; r < n; r++) {
        const tagCount = 1 + Math.floor(Math.random() * 5);
        const tags: Tag[] = [];
        for (let t = 0; t < tagCount; t++) {
          tags.push(ALL_TAGS[Math.floor(Math.random() * ALL_TAGS.length)]);
        }
        const tiers: (TierLabel | null)[] = ["S", "A", "B", "C", null];
        picks.push(
          makePick(
            [...new Set(tags)],
            r,
            tiers[Math.floor(Math.random() * tiers.length)],
          ),
        );
      }
      const profileKeys = Object.keys(PROFILES) as (keyof typeof PROFILES)[];
      const profile =
        PROFILES[profileKeys[Math.floor(Math.random() * profileKeys.length)]];
      const ev = scoreComp(picks, profile);
      expect(ev.score).toBeGreaterThanOrEqual(0);
      expect(ev.score).toBeLessThanOrEqual(100);
    }
  });
});

import {
  ALL_TAGS,
  type Evaluation,
  type GaugeRow,
  type Note,
  type Pick,
  type Profile,
  type Tag,
  type TierLabel,
} from "./types";

const AFFINITY_WEIGHT: Record<TierLabel | "null", number> = {
  S: 1,
  A: 0.7,
  B: 0.4,
  null: 0,
};

function emptyCounts(): Record<Tag, number> {
  return Object.fromEntries(ALL_TAGS.map((t) => [t, 0])) as Record<Tag, number>;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function scoreComp(picks: Pick[], profile: Profile): Evaluation {
  const filled = picks.filter(Boolean);
  const n = filled.length;
  const counts = emptyCounts();
  for (const p of filled) {
    for (const t of p.champ.tags) {
      counts[t]++;
    }
  }

  const scale = n / 5;
  let got = 0;
  let max = 0;
  const rows: GaugeRow[] = [];

  for (const [tag, target] of Object.entries(profile.targets) as [
    Tag,
    number,
  ][]) {
    const need = target * scale;
    const have = counts[tag] || 0;
    max += target;
    got += (need > 0 ? Math.min(have / need, 1) : 1) * target;

    let status: GaugeRow["status"] = "ok";
    if (have < need - 0.35) status = "low";
    else if (have > need + 1.2) status = "high";

    rows.push({ tag, have, target, need, status });
  }

  if (n === 0) {
    return {
      score: 0,
      base: 0,
      affinityBonus: 0,
      rows,
      notes: [],
      counts,
    };
  }

  let base = max ? (got / max) * 100 : 0;
  const notes: Note[] = [];

  const highs = rows.filter((r) => r.status === "high");
  if (highs.length) {
    base -= highs.length * 4;
    notes.push({
      t: "warn",
      m: `Excès : ${highs.map((r) => r.tag).join(", ")}.`,
    });
  }

  const ad = counts.ad || 0;
  const ap = counts.ap || 0;

  if (n >= 4) {
    if (!ad) {
      base -= 14;
      notes.push({ t: "bad", m: "Aucune menace de dégâts physiques." });
    } else if (!ap) {
      base -= 14;
      notes.push({ t: "bad", m: "Aucune menace de dégâts magiques." });
    } else if (n === 5 && Math.min(ad, ap) === 1) {
      base -= 5;
      notes.push({ t: "warn", m: "Menace de dégâts déséquilibrée." });
    }
  }

  if (n >= 4 && !(counts.frontline || 0)) {
    base -= 10;
    notes.push({ t: "bad", m: "Aucune frontline." });
  }

  const affSum = filled.reduce((s, p) => {
    const key = (p.tier ?? "null") as TierLabel | "null";
    return s + AFFINITY_WEIGHT[key];
  }, 0);
  const affinityBonus = (affSum / n) * 12;
  const score = clamp(base + affinityBonus, 0, 100);

  return { score, base, affinityBonus, rows, notes, counts };
}

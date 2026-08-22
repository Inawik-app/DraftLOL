const TAGS = [
  "frontline",
  "engage",
  "disengage",
  "poke",
  "burst",
  "dps",
  "ap",
  "ad",
  "waveclear",
  "pick",
  "dive",
  "scaling",
  "mobility",
  "utility",
  "splitpush",
] as const;

export type Tag = (typeof TAGS)[number];

export type TierLabel = "S" | "A" | "B" | "C";

export const TIER_LABELS: TierLabel[] = ["S", "A", "B", "C"];

export interface Champion {
  id: string;
  key: number;
  name: string;
  title: string;
  tags: Tag[];
  curated: boolean;
  riotTags: string[];
}

export type Pick = {
  champ: Champion;
  tier: TierLabel | null;
  roleIdx: number;
};

export type Profile = {
  name: string;
  targets: Partial<Record<Tag, number>>;
};

export type GaugeRow = {
  tag: Tag;
  have: number;
  target: number;
  need: number;
  status: "low" | "ok" | "high";
};

export type Note = { t: "bad" | "warn" | "good"; m: string };

export type Evaluation = {
  score: number;
  base: number;
  affinityBonus: number;
  rows: GaugeRow[];
  notes: Note[];
  counts: Record<Tag, number>;
};

export type Player = {
  name: string;
  opgg: string;
  tiers: Partial<Record<string, TierLabel>>;
  /** Tier-list order (S→A→B→C) for grid prioritization; from TL1 seed order. */
  tierPoolOrder: string[];
};

const TAG_SET: ReadonlySet<string> = new Set(TAGS);

export function isTag(value: string): value is Tag {
  return TAG_SET.has(value);
}

export const ALL_TAGS: readonly Tag[] = TAGS;

import type { Tag } from "./types";

export type RiotChampionInput = {
  info?: { attack: number; magic: number; defense: number };
  tags?: string[];
};

export function deriveTags(c: RiotChampionInput): Tag[] {
  const t = new Set<Tag>();
  const i = c.info || { attack: 5, magic: 5, defense: 5 };
  if (i.magic >= i.attack) t.add("ap");
  if (i.attack >= i.magic) t.add("ad");
  const k = c.tags || [];
  if (k.includes("Tank")) {
    t.add("frontline");
    t.add("engage");
  }
  if (k.includes("Marksman")) {
    t.add("dps");
  }
  if (k.includes("Assassin")) {
    t.add("burst");
    t.add("mobility");
    t.add("pick");
  }
  if (k.includes("Mage")) {
    t.add("ap");
    t.add("waveclear");
  }
  if (k.includes("Support")) {
    t.add("utility");
  }
  if (k.includes("Fighter")) {
    t.add("dps");
  }
  return [...t];
}

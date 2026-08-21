import { CURATED } from "@/data/tags";
import { deriveTags } from "./deriveTags";
import type { Champion, Tag } from "./types";

type RiotChampion = {
  id: string;
  name: string;
  title: string;
  tags: string[];
  info: { attack: number; magic: number; defense: number };
};

type ChampionsResponse = {
  data: Record<string, RiotChampion>;
};

let cached: { version: string; champions: Champion[] } | null = null;

export async function loadChampions(): Promise<{
  version: string;
  champions: Champion[];
}> {
  if (cached) return cached;

  const versions = (await (
    await fetch("https://ddragon.leagueoflegends.com/api/versions.json")
  ).json()) as string[];
  const version = versions[0];

  const payload = (await (
    await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/champion.json`,
    )
  ).json()) as ChampionsResponse;

  const champions = Object.values(payload.data)
    .map((c) => {
      const cur = CURATED[c.id];
      let tags: Tag[] = cur
        ? (cur.split(" ") as Tag[])
        : deriveTags(c);
      if (!tags.includes("ad") && !tags.includes("ap")) {
        tags = tags.concat(
          deriveTags(c).filter((t) => t === "ad" || t === "ap"),
        );
      }
      return {
        id: c.id,
        name: c.name,
        title: c.title,
        tags: [...new Set(tags)],
        curated: !!cur,
        riotTags: c.tags,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  cached = { version, champions };
  return cached;
}

export function championIconUrl(version: string, id: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;
}

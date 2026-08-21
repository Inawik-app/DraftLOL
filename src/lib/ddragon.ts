import { CURATED } from "@/data/tags";
import { deriveTags } from "./deriveTags";
import { isTag, type Champion, type Tag } from "./types";

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

type LoadResult = { version: string; champions: Champion[] };

const NETWORK_ERROR =
  "Impossible de charger les champions depuis Data Dragon. Vérifie ta connexion et réessaie.";

let pending: Promise<LoadResult> | null = null;

function parseCuratedTags(id: string, raw: string): Tag[] {
  return raw.split(" ").map((token) => {
    if (!isTag(token)) {
      throw new Error(
        `Tag inconnu « ${token} » pour le champion ${id} dans CURATED.`,
      );
    }
    return token;
  });
}

async function fetchChampions(): Promise<LoadResult> {
  let versions: string[];
  let payload: ChampionsResponse;

  try {
    const versionsRes = await fetch(
      "https://ddragon.leagueoflegends.com/api/versions.json",
    );
    if (!versionsRes.ok) throw new Error("versions");
    versions = (await versionsRes.json()) as string[];

    const version = versions[0];
    const champRes = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/champion.json`,
    );
    if (!champRes.ok) throw new Error("champions");
    payload = (await champRes.json()) as ChampionsResponse;

    const champions = Object.values(payload.data)
      .map((c) => {
        const cur = CURATED[c.id];
        const curated = cur !== undefined;
        const tags: Tag[] = curated
          ? parseCuratedTags(c.id, cur)
          : deriveTags(c);
        return {
          id: c.id,
          name: c.name,
          title: c.title,
          tags,
          curated,
          riotTags: c.tags,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));

    return { version, champions };
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.startsWith("Tag inconnu")
    ) {
      throw err;
    }
    throw new Error(NETWORK_ERROR, { cause: err });
  }
}

export function loadChampions(): Promise<LoadResult> {
  if (!pending) {
    pending = fetchChampions().catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

export function championIconUrl(version: string, id: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${id}.png`;
}

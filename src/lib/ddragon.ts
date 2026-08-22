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

export type DDragonErrorKind = "network" | "parse" | "config";

export class DDragonLoadError extends Error {
  readonly kind: DDragonErrorKind;

  constructor(kind: DDragonErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DDragonLoadError";
    this.kind = kind;
  }
}

export const DDRAGON_NETWORK_MSG =
  "Impossible de joindre Data Dragon. Vérifie ta connexion internet, désactive un éventuel bloqueur de pub ou de tracker, puis réessaie.";

export const DDRAGON_PARSE_MSG =
  "Data Dragon a répondu mais les données champions sont illisibles. Réessaie dans quelques minutes — Riot met parfois à jour le format sans prévenir.";

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

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch (err) {
    throw new DDragonLoadError("parse", DDRAGON_PARSE_MSG, {
      cause: err,
    });
  }
}

async function fetchChampions(): Promise<LoadResult> {
  try {
    const versionsRes = await fetch(
      "https://ddragon.leagueoflegends.com/api/versions.json",
    );
    if (!versionsRes.ok) {
      throw new DDragonLoadError("network", DDRAGON_NETWORK_MSG);
    }

    const versionsRaw = await readJson(versionsRes);
    if (!Array.isArray(versionsRaw) || typeof versionsRaw[0] !== "string") {
      throw new DDragonLoadError("parse", DDRAGON_PARSE_MSG);
    }
    const version = versionsRaw[0] as string;

    const champRes = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/champion.json`,
    );
    if (!champRes.ok) {
      throw new DDragonLoadError("network", DDRAGON_NETWORK_MSG);
    }

    const payload = (await readJson(champRes)) as ChampionsResponse;
    if (!payload?.data || typeof payload.data !== "object") {
      throw new DDragonLoadError("parse", DDRAGON_PARSE_MSG);
    }

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
    if (err instanceof DDragonLoadError) throw err;
    if (err instanceof Error && err.message.startsWith("Tag inconnu")) {
      throw new DDragonLoadError("config", err.message, { cause: err });
    }
    throw new DDragonLoadError("network", DDRAGON_NETWORK_MSG, { cause: err });
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

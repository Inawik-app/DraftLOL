import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const VERSION = "14.1.1";

const roster = {
  Ziggs: {
    id: "Ziggs",
    key: "115",
    name: "Ziggs",
    title: "l'Expert des Hexplosifs",
    tags: ["Mage"],
    info: { attack: 2, magic: 9, defense: 4 },
  },
  Ahri: {
    id: "Ahri",
    key: "103",
    name: "Ahri",
    title: "la Renard à Neuf Queues",
    tags: ["Mage", "Assassin"],
    info: { attack: 3, magic: 8, defense: 4 },
  },
  Briar: {
    id: "Briar",
    key: "233",
    name: "Briar",
    title: "la Faim Réprimée",
    tags: ["Fighter", "Assassin"],
    info: { attack: 9, magic: 3, defense: 5 },
  },
};

function jsonResponse(data: unknown): Response {
  return {
    ok: true,
    json: async () => data,
  } as Response;
}

describe("loadChampions", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("trie par nom FR, marque curated, et mémoïse le fetch", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/versions.json")) {
        return jsonResponse([VERSION, "14.1.0"]);
      }
      if (url.includes(`/cdn/${VERSION}/data/fr_FR/champion.json`)) {
        return jsonResponse({ data: roster });
      }
      throw new Error(`URL inattendue: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { loadChampions } = await import("./ddragon");
    const [first, second] = await Promise.all([
      loadChampions(),
      loadChampions(),
    ]);

    expect(first).toBe(second);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(first.version).toBe(VERSION);
    expect(first.champions.map((c) => c.name)).toEqual([
      "Ahri",
      "Briar",
      "Ziggs",
    ]);

    const ahri = first.champions.find((c) => c.id === "Ahri")!;
    const briar = first.champions.find((c) => c.id === "Briar")!;
    const ziggs = first.champions.find((c) => c.id === "Ziggs")!;

    expect(ahri.curated).toBe(true);
    expect(ahri.tags).toEqual(["burst", "ap", "mobility", "pick"]);
    expect(ziggs.curated).toBe(true);
    expect(briar.curated).toBe(false);
    expect(briar.tags.length).toBeGreaterThan(0);
    expect(briar.key).toBe(233);

    const { championIdFromKey, championKeyFromId } = await import("./ddragon");
    expect(championKeyFromId("Ahri")).toBe(103);
    expect(championIdFromKey(103)).toBe("Ahri");
  });

  it("rejette avec un message FR en cas d'échec réseau", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    const { loadChampions, DDRAGON_NETWORK_MSG, DDragonLoadError } =
      await import("./ddragon");
    await expect(loadChampions()).rejects.toThrow(DDRAGON_NETWORK_MSG);
    await expect(loadChampions()).rejects.toBeInstanceOf(DDragonLoadError);
  });

  it("rejette quand le JSON champions est malformé", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/versions.json")) {
        return jsonResponse([VERSION]);
      }
      if (url.includes(`/cdn/${VERSION}/data/fr_FR/champion.json`)) {
        return {
          ok: true,
          json: async () => {
            throw new SyntaxError("Unexpected token");
          },
        } as unknown as Response;
      }
      throw new Error(`URL inattendue: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { loadChampions, DDRAGON_PARSE_MSG, DDragonLoadError } =
      await import("./ddragon");
    await expect(loadChampions()).rejects.toThrow(DDRAGON_PARSE_MSG);
    await expect(loadChampions()).rejects.toMatchObject({ kind: "parse" });
    await expect(loadChampions()).rejects.toBeInstanceOf(DDragonLoadError);
  });
});

describe("championIconUrl", () => {
  it("pointe vers l'icône Data Dragon", async () => {
    const { championIconUrl } = await import("./ddragon");
    expect(championIconUrl("14.1.1", "Ahri")).toBe(
      "https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/Ahri.png",
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  encodeRoom,
  encodeOfflineDraft,
  decodeRoom,
  deriveRoomName,
  extractRidFromHash,
  formatRoomHash,
  formatMissingChampionsMessage,
  generateRoomId,
  hashRoomId,
  type RoomState,
} from "./token";
import type { Champion, Player } from "./types";

function champ(id: string, name = id, key = id.length * 10): Champion {
  return {
    id,
    key,
    name,
    title: "titre",
    tags: ["ad"],
    curated: true,
    riotTags: [],
  };
}

const ahri = champ("Ahri");
const zed = champ("Zed");
const lux = champ("Lux");
const roster = [ahri, zed, lux];

function sampleState(): RoomState {
  const players: Player[] = [0, 1, 2, 3, 4].map((i): Player => {
    if (i === 0) {
      return {
        name: "Alice",
        opgg: "https://op.gg/alice",
        tiers: {},
        stats: {},
      };
    }
    if (i === 2) {
      return {
        name: "",
        opgg: "",
        tiers: { Ahri: "S" },
        stats: { Ahri: { games: 40, wr: 55, vs: { Zed: 60 } } },
      };
    }
    return { name: "", opgg: "", tiers: {}, stats: {} };
  });
  return {
    profileKey: "poke",
    picks: {
      blue: [ahri, null, zed, null, null],
      red: [null, lux, null, null, null],
    },
    bans: {
      blue: ["Yasuo", "", "", "", ""],
      red: ["", "Syndra", "", "", ""],
    },
    players,
  };
}

describe("encodeRoom / decodeRoom", () => {
  it("aller-retour préserve picks, bans, profil et joueurs", () => {
    const state = sampleState();
    const token = encodeRoom(state);
    expect(token.startsWith("DRAFT1.")).toBe(true);

    const decoded = decodeRoom(token, roster);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;

    expect(decoded.state.profileKey).toBe("poke");
    expect(decoded.state.picks.blue.map((p) => p?.id ?? null)).toEqual([
      "Ahri",
      null,
      "Zed",
      null,
      null,
    ]);
    expect(decoded.state.picks.red.map((p) => p?.id ?? null)).toEqual([
      null,
      "Lux",
      null,
      null,
      null,
    ]);
    expect(decoded.state.bans).toEqual(state.bans);
    expect(decoded.state.players[0].name).toBe("Alice");
    expect(decoded.state.players[0].opgg).toBe("https://op.gg/alice");
    expect(decoded.state.players[2].tiers.Ahri).toBe("S");
    expect(decoded.state.players[2].stats).toEqual({});
  });

  it("encodeOfflineDraft n'inclut pas le rid ni les stats", () => {
    const state = sampleState();
    const token = encodeOfflineDraft(state);
    expect(token.startsWith("DRAFT1.")).toBe(true);
    const decoded = decodeRoom(token, roster);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.state.rid).toBeUndefined();
    expect(decoded.state.players[2].stats).toEqual({});
  });

  it("extractRidFromHash lit un uuid dans #r=", () => {
    const rid = "550e8400-e29b-41d4-a716-446655440000";
    expect(extractRidFromHash(formatRoomHash(rid))).toBe(rid);
    expect(
      extractRidFromHash(
        `https://draft.example/#r=${rid}`,
      ),
    ).toBe(rid);
  });

  it("ignore silencieusement un champion absent du patch", () => {
    const state = sampleState();
    state.picks.blue[0] = champ("GhostChamp");
    const token = encodeRoom(state);
    const decoded = decodeRoom(token, roster);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.state.picks.blue[0]).toBeNull();
    expect(decoded.state.picks.blue[2]?.id).toBe("Zed");
    expect(decoded.missingChampionIds).toContain("GhostChamp");
  });

  it("préfixe absent", () => {
    const r = decodeRoom("pas-un-token", roster);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason.toLowerCase()).toMatch(/préfixe|prefixe|draft/);
  });

  it("version inconnue DRAFT2", () => {
    const r = decodeRoom("DRAFT2.abcdef", roster);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason.toLowerCase()).toMatch(/version|draft2|inconnue/);
  });

  it("payload tronqué (vingt derniers caractères retirés)", () => {
    const token = encodeRoom(sampleState());
    const truncated = token.slice(0, -20);
    const r = decodeRoom(truncated, roster);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason.length).toBeGreaterThan(0);
      expect(r.reason.toLowerCase()).toMatch(
        /tronqu|illisible|invalide|compress/,
      );
    }
  });

  it("JSON invalide", async () => {
    const lz = await import("lz-string");
    const token = "DRAFT1." + lz.compressToEncodedURIComponent("not-json{");
    const r = decodeRoom(token, roster);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason.toLowerCase()).toMatch(/json|invalide/);
  });

  it("structure inattendue", async () => {
    const lz = await import("lz-string");
    const token =
      "DRAFT1." + lz.compressToEncodedURIComponent(JSON.stringify({ x: 1 }));
    const r = decodeRoom(token, roster);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason.toLowerCase()).toMatch(/structure|inattendue|format/);
  });

  it("decodeRoom ne jette jamais", () => {
    const junk = [
      "",
      "DRAFT1.",
      "DRAFT1.%zz",
      "DRAFT9.xxx",
      null as unknown as string,
      undefined as unknown as string,
    ];
    for (const t of junk) {
      expect(() => decodeRoom(t, roster)).not.toThrow();
      const r = decodeRoom(t ?? "", roster);
      expect(r.ok).toBe(false);
    }
  });

  it("préserve le rid (i) à l'aller-retour", () => {
    const rid = "550e8400-e29b-41d4-a716-446655440000";
    const state = { ...sampleState(), rid };
    const token = encodeRoom(state);
    const decoded = decodeRoom(token, roster);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.state.rid).toBe(rid);
  });

  it("token sans rid reste valide (draft hors ligne)", () => {
    const token = encodeRoom(sampleState());
    const decoded = decodeRoom(token, roster);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.state.rid).toBeUndefined();
    expect(deriveRoomName(token)).toBeNull();
  });

  it("deriveRoomName ne dépend pas du contenu draft", () => {
    const rid = generateRoomId();
    const base = { ...sampleState(), rid };
    const token1 = encodeRoom(base);
    base.picks.blue[0] = champ("Yasuo");
    base.profileKey = "dive";
    const token2 = encodeRoom(base);
    expect(deriveRoomName(token1)).toBe(hashRoomId(rid));
    expect(deriveRoomName(token2)).toBe(hashRoomId(rid));
  });

  it("formatMissingChampionsMessage liste les ids absents", () => {
    expect(formatMissingChampionsMessage(["Yasuo", "Ahri"])).toMatch(/Yasuo/);
    expect(formatMissingChampionsMessage(["Yasuo", "Ahri"])).toMatch(/Ahri/);
    expect(formatMissingChampionsMessage([])).toBe("");
  });
});

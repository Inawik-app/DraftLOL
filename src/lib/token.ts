import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import { PROFILES, type ProfileKey } from "@/data/profiles";
import type { Champion, Player, TierLabel } from "./types";

const TOKEN_PREFIX = "DRAFT1.";
const TOKEN_VERSION_RE = /^DRAFT(\d+)\./;

export type RoomState = {
  profileKey: ProfileKey;
  picks: {
    blue: (Champion | null)[];
    red: (Champion | null)[];
  };
  bans: {
    blue: string[];
    red: string[];
  };
  players: Player[];
};

type CompactPlayer = {
  n?: string;
  o?: string;
  t?: Record<string, string>;
  s?: Record<string, unknown>;
};

type CompactPayload = {
  p?: string;
  b?: unknown;
  r?: unknown;
  bb?: unknown;
  rb?: unknown;
  pl?: unknown;
};

function emptyPlayers(): Player[] {
  return [0, 1, 2, 3, 4].map(() => ({
    name: "",
    opgg: "",
    tiers: {},
    stats: {},
  }));
}

function padFiveStrings(arr: unknown, fallback = ""): string[] {
  const src = Array.isArray(arr) ? arr : [];
  const out: string[] = [];
  for (let i = 0; i < 5; i++) {
    const v = src[i];
    out.push(typeof v === "string" ? v : fallback);
  }
  return out;
}

function resolvePicks(
  ids: string[],
  byId: Map<string, Champion>,
): (Champion | null)[] {
  return ids.map((id) => {
    if (!id) return null;
    return byId.get(id) ?? null;
  });
}

function normalizePlayers(raw: unknown): Player[] {
  const base = emptyPlayers();
  if (!Array.isArray(raw)) return base;
  return base.map((fallback, i) => {
    const row = raw[i] as CompactPlayer | undefined;
    if (!row || typeof row !== "object") return fallback;
    const tiers: Player["tiers"] = {};
    if (row.t && typeof row.t === "object" && !Array.isArray(row.t)) {
      for (const [id, tier] of Object.entries(row.t)) {
        if (tier === "S" || tier === "A" || tier === "B") {
          tiers[id] = tier as TierLabel;
        }
      }
    }
    const stats =
      row.s && typeof row.s === "object" && !Array.isArray(row.s)
        ? (row.s as Player["stats"])
        : {};
    return {
      name: typeof row.n === "string" ? row.n : "",
      opgg: typeof row.o === "string" ? row.o : "",
      tiers,
      stats,
    };
  });
}

function isProfileKey(value: string): value is ProfileKey {
  return Object.prototype.hasOwnProperty.call(PROFILES, value);
}

export function encodeRoom(state: RoomState): string {
  const compact: CompactPayload = {
    p: state.profileKey,
    b: state.picks.blue.map((p) => (p ? p.id : "")),
    r: state.picks.red.map((p) => (p ? p.id : "")),
    bb: state.bans.blue,
    rb: state.bans.red,
    pl: state.players.map((pl) => ({
      n: pl.name,
      o: pl.opgg,
      t: pl.tiers,
      s: pl.stats,
    })),
  };
  return (
    TOKEN_PREFIX +
    compressToEncodedURIComponent(JSON.stringify(compact))
  );
}

export function decodeRoom(
  token: string,
  champions: Champion[],
): { ok: true; state: RoomState } | { ok: false; reason: string } {
  try {
    if (typeof token !== "string" || !token.trim()) {
      return {
        ok: false,
        reason: "Token vide. Colle un token commençant par DRAFT1.",
      };
    }

    const trimmed = token.trim();
    const versionMatch = trimmed.match(TOKEN_VERSION_RE);

    if (!versionMatch) {
      return {
        ok: false,
        reason:
          "Préfixe absent. Le token doit commencer par DRAFT1. — recopie-le en entier.",
      };
    }

    const version = Number(versionMatch[1]);
    if (version !== 1) {
      return {
        ok: false,
        reason: `Version de token inconnue (DRAFT${version}). Ce client ne lit que DRAFT1.`,
      };
    }

    const payload = trimmed.slice(TOKEN_PREFIX.length);
    if (!payload) {
      return {
        ok: false,
        reason: "Payload manquant après DRAFT1. — token tronqué.",
      };
    }

    let json: string | null;
    try {
      json = decompressFromEncodedURIComponent(payload);
    } catch {
      return {
        ok: false,
        reason:
          "Payload illisible ou tronqué. Recopie le token en entier, préfixe compris.",
      };
    }

    if (json == null || json === "") {
      return {
        ok: false,
        reason:
          "Payload illisible ou tronqué. Recopie le token en entier, préfixe compris.",
      };
    }

    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch {
      return {
        ok: false,
        reason: "JSON invalide dans le token. Le contenu est corrompu.",
      };
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return {
        ok: false,
        reason: "Structure inattendue dans le token.",
      };
    }

    const compact = data as CompactPayload;
    if (
      typeof compact.p !== "string" ||
      !Array.isArray(compact.b) ||
      !Array.isArray(compact.r) ||
      !Array.isArray(compact.bb) ||
      !Array.isArray(compact.rb) ||
      !Array.isArray(compact.pl)
    ) {
      return {
        ok: false,
        reason:
          "Structure inattendue : il manque le profil, les picks, les bans ou les joueurs.",
      };
    }

    const profileKey = isProfileKey(compact.p) ? compact.p : "teamfight";
    const byId = new Map(champions.map((c) => [c.id, c]));

    const state: RoomState = {
      profileKey,
      picks: {
        blue: resolvePicks(padFiveStrings(compact.b), byId),
        red: resolvePicks(padFiveStrings(compact.r), byId),
      },
      bans: {
        blue: padFiveStrings(compact.bb),
        red: padFiveStrings(compact.rb),
      },
      players: normalizePlayers(compact.pl),
    };

    return { ok: true, state };
  } catch {
    return {
      ok: false,
      reason: "Token illisible. Recopie-le en entier, préfixe compris.",
    };
  }
}

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
  /** Stable room id for realtime sync; omitted for offline-only tokens. */
  rid?: string;
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
  /** Room id (rid) — stable for the lifetime of a salle. */
  i?: unknown;
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

/** Short deterministic hash — sync-safe in browser and Node tests. */
export function hashRoomId(rid: string): string {
  const bytes = new TextEncoder().encode(rid);
  let h1 = 2166136261;
  let h2 = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    h1 ^= bytes[i]!;
    h1 = Math.imul(h1, 16777619);
    h2 ^= bytes[bytes.length - 1 - i]!;
    h2 = Math.imul(h2, 16777619);
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, "0") +
    (h2 >>> 0).toString(16).padStart(8, "0")
  );
}

export function generateRoomId(): string {
  return crypto.randomUUID();
}

function parseCompactPayload(
  token: string,
): { ok: true; compact: CompactPayload } | { ok: false; reason: string } {
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

  return { ok: true, compact: data as CompactPayload };
}

/**
 * Returns a short hashed room name from the token's stable room id (`i`).
 * Returns null when the token has no room id (offline-only draft).
 */
export function deriveRoomName(token: string): string | null {
  const parsed = parseCompactPayload(token);
  if (!parsed.ok) return null;
  const rid = parsed.compact.i;
  if (typeof rid !== "string" || !rid.trim()) return null;
  return hashRoomId(rid.trim());
}

/** WebRTC room name from a stable session rid (same input as deriveRoomName for tokens carrying `i`). */
export function deriveRoomNameFromRid(rid: string): string {
  return hashRoomId(rid.trim());
}

export function replaceLocationHash(token: string): void {
  const next = `#${token}`;
  if (window.location.hash === next) return;
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${next}`,
  );
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
  if (state.rid) {
    compact.i = state.rid;
  }
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
    const parsed = parseCompactPayload(token);
    if (!parsed.ok) return parsed;

    const compact = parsed.compact;
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
    const rid = typeof compact.i === "string" && compact.i.trim() ? compact.i.trim() : undefined;

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
      ...(rid ? { rid } : {}),
    };

    return { ok: true, state };
  } catch {
    return {
      ok: false,
      reason: "Token illisible. Recopie-le en entier, préfixe compris.",
    };
  }
}

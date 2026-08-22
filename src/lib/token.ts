import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import { PROFILES, type ProfileKey } from "@/data/profiles";
import type { Champion, Player, TierLabel } from "./types";

const TOKEN_PREFIX = "DRAFT1.";
const TOKEN_VERSION_RE = /DRAFT(\d+)\./;
export const KNOWN_TOKEN_PREFIXES = ["DRAFT1.", "TL1."] as const;

const EXTRACT_PREFIX_RE = /(?:DRAFT\d+\.|TL1\.)/;
const TOKEN_BODY_RE = /^((?:DRAFT\d+\.|TL1\.)[^\s"'<>]+)/;

/**
 * Extracts a bare DRAFT1. or TL1. token from pasted text (URL, hash, quotes, junk).
 * Returns null when no known prefix is found.
 */
export function extractToken(input: string): string | null {
  if (typeof input !== "string") return null;

  let s = input.trim();
  if (!s) return null;

  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }

  s = s.replace(/[\r\n]+/g, " ").trim();
  s = s.replace(/[.,;!?]+$/g, "");

  try {
    if (/%[0-9A-Fa-f]{2}/.test(s)) {
      s = decodeURIComponent(s);
    }
  } catch {
    // keep raw string
  }

  const rParam = s.match(/(?:[#?&]|^)r=((?:DRAFT\d+\.|TL1\.).+)/);
  if (rParam?.[1]) return sliceTokenBody(rParam[1]);

  const hashMatch = s.match(/#(?:r=)?((?:DRAFT\d+\.|TL1\.).+)/);
  if (hashMatch?.[1]) return sliceTokenBody(hashMatch[1]);

  const start = s.search(EXTRACT_PREFIX_RE);
  if (start !== -1) return sliceTokenBody(s.slice(start));

  return null;
}

function sliceTokenBody(raw: string): string | null {
  const trimmed = raw.trim();
  const match = trimmed.match(TOKEN_BODY_RE);
  return match?.[1] ?? null;
}

export function formatShareHash(token: string): string {
  return `#r=${encodeURIComponent(token)}`;
}

/** Room link hash — only the stable room id (~40 chars with prefix). */
export function formatRoomHash(rid: string): string {
  return `#r=${rid}`;
}

export function formatRoomUrl(rid: string): string {
  if (typeof window === "undefined") return formatRoomHash(rid);
  return `${window.location.origin}${window.location.pathname}${window.location.search}${formatRoomHash(rid)}`;
}

const ROOM_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidRoomId(rid: string): boolean {
  return ROOM_ID_RE.test(rid.trim());
}

/**
 * Extracts a room id from `#r=<uuid>`, a full URL, or legacy DRAFT1. tokens carrying `i`.
 */
export function extractRidFromHash(input: string): string | null {
  if (typeof input !== "string") return null;

  let s = input.trim();
  if (!s) return null;

  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }

  s = s.replace(/[\r\n]+/g, " ").trim();
  s = s.replace(/[.,;!?]+$/g, "");

  try {
    if (/%[0-9A-Fa-f]{2}/.test(s)) {
      s = decodeURIComponent(s);
    }
  } catch {
    // keep raw
  }

  const rUuid = s.match(/(?:[#?&]|^)r=([0-9a-f-]{36})/i);
  if (rUuid?.[1] && isValidRoomId(rUuid[1])) return rUuid[1];

  const legacyRid = extractRoomIdFromToken(s);
  if (legacyRid && isValidRoomId(legacyRid)) return legacyRid;

  return null;
}

export function replaceLocationRid(rid: string): void {
  const next = formatRoomHash(rid);
  if (window.location.hash === next) return;
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${next}`,
  );
}

export function formatShareUrl(token: string): string {
  if (typeof window === "undefined") return formatShareHash(token);
  return `${window.location.origin}${window.location.pathname}${window.location.search}${formatShareHash(token)}`;
}

export type OfflineDraftState = {
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

export type RoomState = OfflineDraftState & {
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

/** Champion ids referenced in a token but absent from the current patch roster. */
export function findMissingChampionIds(
  compact: CompactPayload,
  byId: Map<string, Champion>,
): string[] {
  const missing = new Set<string>();
  const pickIds = [
    ...padFiveStrings(compact.b),
    ...padFiveStrings(compact.r),
    ...padFiveStrings(compact.bb),
    ...padFiveStrings(compact.rb),
  ];
  for (const id of pickIds) {
    if (id && !byId.has(id)) missing.add(id);
  }
  return [...missing].sort((a, b) => a.localeCompare(b));
}

export function formatMissingChampionsMessage(ids: string[]): string {
  if (!ids.length) return "";
  const list = ids.join(", ");
  return `Ce token référence des champions absents du patch actuel (${list}). Les emplacements concernés sont vides — remplace ces picks ou repartage un lien à jour après les avoir corrigés.`;
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
    return {
      name: typeof row.n === "string" ? row.n : "",
      opgg: typeof row.o === "string" ? row.o : "",
      tiers,
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

const SESSION_ROOM_RID_KEY = "draftboard.sessionRoomRid.v1";

/** Persists the active room id for nav back from /tiers (hash lives on / only). */
export function persistSessionRoomRid(rid: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_ROOM_RID_KEY, rid);
  } catch {
    // ignore quota / privacy mode
  }
}

export function loadSessionRoomRid(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const rid = sessionStorage.getItem(SESSION_ROOM_RID_KEY);
    return rid && isValidRoomId(rid) ? rid : null;
  } catch {
    return null;
  }
}

export function formatDraftPathWithRid(rid: string): string {
  return `/${formatRoomHash(rid)}`;
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
  const extracted = extractToken(trimmed);
  if (!extracted) {
    return {
      ok: false,
      reason:
        "Préfixe absent. Le token doit commencer par DRAFT1. — recopie-le en entier.",
    };
  }
  const versionMatch = extracted.match(TOKEN_VERSION_RE);

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

  const payload = extracted.slice(TOKEN_PREFIX.length);
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

/** Reads stable room id (`i`) from a DRAFT token without decoding picks. */
export function extractRoomIdFromToken(input: string): string | null {
  const token = extractToken(input);
  if (!token) return null;
  const parsed = parseCompactPayload(token);
  if (!parsed.ok) return null;
  const rid = parsed.compact.i;
  return typeof rid === "string" && rid.trim() ? rid.trim() : null;
}

export function replaceLocationHash(token: string): void {
  const next = formatShareHash(token);
  if (window.location.hash === next) return;
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${next}`,
  );
}

export function encodeOfflineDraft(state: OfflineDraftState): string {
  const compact: CompactPayload = {
    p: state.profileKey,
    b: state.picks.blue.map((p) => (p ? p.id : "")),
    r: state.picks.red.map((p) => (p ? p.id : "")),
    bb: state.bans.blue,
    rb: state.bans.red,
    pl: state.players.map((pl) => ({
      n: pl.name,
      t: pl.tiers,
    })),
  };
  return (
    TOKEN_PREFIX +
    compressToEncodedURIComponent(JSON.stringify(compact))
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
      t: pl.tiers,
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
): | { ok: true; state: RoomState; missingChampionIds: string[] }
  | { ok: false; reason: string } {
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
    const missingChampionIds = findMissingChampionIds(compact, byId);

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

    return { ok: true, state, missingChampionIds };
  } catch {
    return {
      ok: false,
      reason: "Token illisible. Recopie-le en entier, préfixe compris.",
    };
  }
}

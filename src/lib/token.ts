import {
  decompressFromEncodedURIComponent,
} from "lz-string";

const TOKEN_PREFIX = "DRAFT1.";
const TOKEN_VERSION_RE = /DRAFT(\d+)\./;
export const KNOWN_TOKEN_PREFIXES = ["DRAFT1.", "TL1."] as const;

const EXTRACT_PREFIX_RE = /(?:DRAFT\d+\.|TL1\.)/;
const TOKEN_BODY_RE = /^((?:DRAFT\d+\.|TL1\.)[^\s"'<>]+)/;

type CompactPayload = {
  i?: unknown;
};

/**
 * Extracts a bare DRAFT1. or TL1. token from pasted text (URL, hash, quotes, junk).
 * DRAFT1 remains recognized for legacy room-id extraction only.
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

function parseLegacyDraftPayload(
  token: string,
): { ok: true; compact: CompactPayload } | { ok: false } {
  const extracted = extractToken(token);
  if (!extracted) return { ok: false };

  const versionMatch = extracted.match(TOKEN_VERSION_RE);
  if (!versionMatch || Number(versionMatch[1]) !== 1) return { ok: false };

  const payload = extracted.slice(TOKEN_PREFIX.length);
  if (!payload) return { ok: false };

  let json: string | null;
  try {
    json = decompressFromEncodedURIComponent(payload);
  } catch {
    return { ok: false };
  }
  if (json == null || json === "") return { ok: false };

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false };
  }

  return { ok: true, compact: data as CompactPayload };
}

/** WebRTC room name from a stable session rid. */
export function deriveRoomNameFromRid(rid: string): string {
  return hashRoomId(rid.trim());
}

/** Reads stable room id (`i`) from a legacy DRAFT token. */
export function extractRoomIdFromToken(input: string): string | null {
  const token = extractToken(input);
  if (!token) return null;
  const parsed = parseLegacyDraftPayload(token);
  if (!parsed.ok) return null;
  const rid = parsed.compact.i;
  return typeof rid === "string" && rid.trim() ? rid.trim() : null;
}

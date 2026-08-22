/** Web-safe base64url (RFC 4648) — no Node Buffer APIs. */
export function bytesToBase64url(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Inverse of bytesToBase64url; returns null on invalid input (never throws). */
export function base64urlToBytes(s: string): Uint8Array | null {
  if (typeof s !== "string" || !s) return new Uint8Array(0);
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
  try {
    let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  } catch {
    return null;
  }
}

function writeVarint(n: number, out: number[]): void {
  let v = Math.floor(n);
  if (v < 0) return;
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v);
}

function readVarint(bytes: Uint8Array, pos: { i: number }): number | null {
  let result = 0;
  let shift = 0;
  while (pos.i < bytes.length) {
    const b = bytes[pos.i]!;
    pos.i += 1;
    result |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) return result;
    shift += 7;
    if (shift > 35) return null;
  }
  return null;
}

function assertIntegerKeys(keys: number[]): number[] {
  const out: number[] = [];
  for (const k of keys) {
    if (!Number.isInteger(k) || k < 0) {
      throw new Error(
        `packChampionKeys: chaque clé doit être un entier ≥ 0 (reçu ${String(k)})`,
      );
    }
    out.push(k);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

/** Sorts, delta-encodes with varints, then base64url. */
export function packChampionKeys(keys: number[]): string {
  const sorted = assertIntegerKeys(keys);
  if (sorted.length === 0) return "";

  const bytes: number[] = [];
  let prev = 0;
  for (let i = 0; i < sorted.length; i++) {
    const key = sorted[i]!;
    const delta = i === 0 ? key : key - prev;
    writeVarint(delta, bytes);
    prev = key;
  }
  return bytesToBase64url(new Uint8Array(bytes));
}

/** Inverse of packChampionKeys; returns [] on any corruption (never throws). */
export function unpackChampionKeys(s: string): number[] {
  if (typeof s !== "string" || !s) return [];
  const bytes = base64urlToBytes(s);
  if (!bytes) return [];

  const pos = { i: 0 };
  const keys: number[] = [];
  let prev = 0;

  while (pos.i < bytes.length) {
    const delta = readVarint(bytes, pos);
    if (delta === null) return [];
    const key = keys.length === 0 ? delta : prev + delta;
    keys.push(key);
    prev = key;
  }

  return keys;
}

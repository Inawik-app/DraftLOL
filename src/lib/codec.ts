const BASE64URL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function bytesToBase64url(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    const n = (b0 << 16) | (b1 << 8) | b2;
    out += BASE64URL[(n >> 18) & 63];
    out += BASE64URL[(n >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64URL[(n >> 6) & 63] : "";
    out += i + 2 < bytes.length ? BASE64URL[n & 63] : "";
  }
  return out;
}

function base64urlToBytes(s: string): Uint8Array | null {
  if (!s) return new Uint8Array(0);
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
  try {
    if (typeof Buffer !== "undefined") {
      return new Uint8Array(Buffer.from(s, "base64url"));
    }
    const pad = s.length % 4 === 0 ? s : s + "=".repeat(4 - (s.length % 4));
    let bin = "";
    for (let i = 0; i < pad.length; i += 4) {
      const n =
        (BASE64URL.indexOf(pad[i]!) << 18) |
        (BASE64URL.indexOf(pad[i + 1]!) << 12) |
        ((pad[i + 2] === "=" ? 0 : BASE64URL.indexOf(pad[i + 2]!)) << 6) |
        (pad[i + 3] === "=" ? 0 : BASE64URL.indexOf(pad[i + 3]!));
      if (BASE64URL.indexOf(pad[i]!) < 0 || BASE64URL.indexOf(pad[i + 1]!) < 0) {
        return null;
      }
      bin += String.fromCharCode((n >> 16) & 255);
      if (pad[i + 2] !== "=") bin += String.fromCharCode((n >> 8) & 255);
      if (pad[i + 3] !== "=") bin += String.fromCharCode(n & 255);
    }
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
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

function normalizeKeys(keys: number[]): number[] {
  const valid = keys.filter((k) => Number.isInteger(k) && k >= 0);
  return [...new Set(valid)].sort((a, b) => a - b);
}

/** Sorts, delta-encodes with varints, then base64url. */
export function packChampionKeys(keys: number[]): string {
  const sorted = normalizeKeys(keys);
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

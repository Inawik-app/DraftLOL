import { afterEach, beforeEach } from "vitest";

/** Ensures codec/token tests exercise the browser path (no Node Buffer shortcut). */
const savedBuffer = globalThis.Buffer;

beforeEach(() => {
  // @ts-expect-error — simulate browser bundle without Buffer
  delete globalThis.Buffer;
});

afterEach(() => {
  globalThis.Buffer = savedBuffer;
});

import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import type { ProfileKey } from "@/data/profiles";
import type { Champion } from "./types";

export const DEFAULT_SIGNALING_URLS = ["wss://y-webrtc-eu.fly.dev"] as const;

export type TeamPickIds = { blue: string[]; red: string[] };
export type TeamBanIds = { blue: string[]; red: string[] };

export type SharedDraftPayload = {
  profileKey: ProfileKey;
  picks: TeamPickIds;
  bans: TeamBanIds;
};

export type RoomStatus = {
  /** Provider is connected to signaling (not the same as having peers). */
  signalingConnected: boolean;
  peerCount: number;
};

const LOCAL_ORIGIN = "local";
const emptyPickIds = (): TeamPickIds => ({
  blue: ["", "", "", "", ""],
  red: ["", "", "", "", ""],
});
const emptyBanIds = (): TeamBanIds => ({
  blue: ["", "", "", "", ""],
  red: ["", "", "", "", ""],
});

let ydoc: Y.Doc | null = null;
let provider: WebrtcProvider | null = null;
let draftMap: Y.Map<unknown> | null = null;
let activeRoomName: string | null = null;

let championById = new Map<string, Champion>();
const catalogListeners = new Set<() => void>();
const statusListeners = new Set<(status: RoomStatus) => void>();
const draftMapListeners = new Set<(map: Y.Map<unknown>) => void>();

let status: RoomStatus = { signalingConnected: false, peerCount: 0 };

function padFiveStrings(arr: unknown): string[] {
  const src = Array.isArray(arr) ? arr : [];
  const out: string[] = [];
  for (let i = 0; i < 5; i++) {
    const v = src[i];
    out.push(typeof v === "string" ? v : "");
  }
  return out;
}

function normalizeTeamPickIds(raw: unknown): TeamPickIds {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyPickIds();
  }
  const obj = raw as { blue?: unknown; red?: unknown };
  return {
    blue: padFiveStrings(obj.blue),
    red: padFiveStrings(obj.red),
  };
}

function normalizeTeamBanIds(raw: unknown): TeamBanIds {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyBanIds();
  }
  const obj = raw as { blue?: unknown; red?: unknown };
  return {
    blue: padFiveStrings(obj.blue),
    red: padFiveStrings(obj.red),
  };
}

function emitStatus() {
  for (const listener of statusListeners) {
    listener(status);
  }
}

function emitDraftMap() {
  if (!draftMap) return;
  for (const listener of draftMapListeners) {
    listener(draftMap);
  }
}

function updatePeerCount(webrtcPeers: string[], bcPeers: string[]) {
  status = { ...status, peerCount: webrtcPeers.length + bcPeers.length };
  emitStatus();
}

function onProviderStatus(event: { connected: boolean }) {
  status = { ...status, signalingConnected: event.connected };
  emitStatus();
}

function onProviderPeers(event: {
  webrtcPeers: string[];
  bcPeers: string[];
}) {
  updatePeerCount(event.webrtcPeers, event.bcPeers);
}

function teardownProvider() {
  if (provider) {
    provider.off("status", onProviderStatus);
    provider.off("peers", onProviderPeers);
    provider.destroy();
    provider = null;
  }
  if (ydoc) {
    ydoc.destroy();
    ydoc = null;
  }
  draftMap = null;
  activeRoomName = null;
  status = { signalingConnected: false, peerCount: 0 };
  emitStatus();
}

export function setChampionCatalog(champions: Champion[]): void {
  championById = new Map(champions.map((c) => [c.id, c]));
  for (const listener of catalogListeners) {
    listener();
  }
}

export function getChampionById(id: string): Champion | undefined {
  return championById.get(id);
}

export function subscribeChampionCatalog(listener: () => void): () => void {
  catalogListeners.add(listener);
  return () => catalogListeners.delete(listener);
}

export function readSharedDraft(map: Y.Map<unknown>): SharedDraftPayload | null {
  if (map.size === 0) return null;

  const profileRaw = map.get("profileKey");
  const profileKey =
    typeof profileRaw === "string" ? (profileRaw as ProfileKey) : "teamfight";

  return {
    profileKey,
    picks: normalizeTeamPickIds(map.get("picks")),
    bans: normalizeTeamBanIds(map.get("bans")),
  };
}

export function hasSharedDraftKeys(map: Y.Map<unknown>): boolean {
  return map.size > 0;
}

/**
 * Writes shared draft fields inside a transaction. Only for explicit user actions.
 * connectRoom never calls this.
 */
export function writeSharedDraft(payload: SharedDraftPayload): void {
  if (!ydoc || !draftMap) return;
  ydoc.transact(() => {
    draftMap!.set("profileKey", payload.profileKey);
    draftMap!.set("picks", payload.picks);
    draftMap!.set("bans", payload.bans);
  }, LOCAL_ORIGIN);
}

export function getDraftMap(): Y.Map<unknown> | null {
  return draftMap;
}

export function isRoomConnected(): boolean {
  return provider !== null && activeRoomName !== null;
}

/**
 * Opens a WebRTC room. Never writes to the Y.Map — remote state is read-only on join.
 */
export function connectRoom(roomName: string): void {
  if (activeRoomName === roomName && provider) return;

  disconnectRoom();

  activeRoomName = roomName;
  ydoc = new Y.Doc();
  draftMap = ydoc.getMap("draft");

  provider = new WebrtcProvider(roomName, ydoc, {
    signaling: [...DEFAULT_SIGNALING_URLS],
  });

  provider.on("status", onProviderStatus);
  provider.on("peers", onProviderPeers);

  status = {
    signalingConnected: provider.connected,
    peerCount: 0,
  };
  emitStatus();
  emitDraftMap();
}

export function disconnectRoom(): void {
  teardownProvider();
}

export function subscribeRoomStatus(listener: (s: RoomStatus) => void): () => void {
  statusListeners.add(listener);
  listener(status);
  return () => statusListeners.delete(listener);
}

export function subscribeDraftMap(listener: (map: Y.Map<unknown>) => void): () => void {
  draftMapListeners.add(listener);
  if (draftMap) listener(draftMap);
  return () => draftMapListeners.delete(listener);
}

/** Test helper: apply shared draft to a doc without going through connectRoom. */
export function writeSharedDraftToDoc(
  doc: Y.Doc,
  payload: SharedDraftPayload,
  origin: unknown = LOCAL_ORIGIN,
): void {
  const map = doc.getMap("draft");
  doc.transact(() => {
    map.set("profileKey", payload.profileKey);
    map.set("picks", payload.picks);
    map.set("bans", payload.bans);
  }, origin);
}

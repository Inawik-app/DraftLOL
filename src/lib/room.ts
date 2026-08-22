import * as Y from "yjs";
import { IndexeddbPersistence, clearDocument } from "y-indexeddb";
import { WebrtcProvider } from "y-webrtc";
import type { ProfileKey } from "@/data/profiles";
import {
  deriveRoomNameFromRid,
  extractRidFromHash,
} from "@/lib/token";
import { normalizeSeries, type SeriesState } from "@/lib/series";
import type { Champion } from "./types";

export const DEFAULT_SIGNALING_URLS = ["wss://y-webrtc-eu.fly.dev"] as const;

export type TeamPickIds = { blue: string[]; red: string[] };
export type TeamBanIds = { blue: string[]; red: string[] };

export type SharedPlayerEntry = {
  name: string;
  tierSeed: string;
};

export type SharedPlayersByRole = Partial<Record<number, SharedPlayerEntry>>;

export type SharedDraftPayload = {
  profileKey: ProfileKey;
  picks: TeamPickIds;
  bans: TeamBanIds;
  series: SeriesState;
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

export type RoomPersistenceStatus = "idle" | "loading" | "ready" | "unavailable";

export type DisconnectRoomOptions = {
  /** Removes the IndexedDB snapshot for the active room (e.g. when leaving). */
  clearIndexedDb?: boolean;
};

let ydoc: Y.Doc | null = null;
let provider: WebrtcProvider | null = null;
let idbPersistence: IndexeddbPersistence | null = null;
let draftMap: Y.Map<unknown> | null = null;
let playersMap: Y.Map<unknown> | null = null;
let activeRoomName: string | null = null;
let persistenceStatus: RoomPersistenceStatus = "idle";

const persistenceListeners = new Set<(status: RoomPersistenceStatus) => void>();

let championById = new Map<string, Champion>();
const catalogListeners = new Set<() => void>();
const statusListeners = new Set<(status: RoomStatus) => void>();
const draftMapListeners = new Set<(map: Y.Map<unknown>) => void>();
const playersMapListeners = new Set<(map: Y.Map<unknown>) => void>();

let status: RoomStatus = {
  signalingConnected: false,
  peerCount: 0,
};

function updatePeerCount(webrtcPeers: string[], bcPeers: string[]) {
  const peerCount = webrtcPeers.length + bcPeers.length;
  status = { ...status, peerCount };
  emitStatus();
}

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

let debugMapObserver: ((event: Y.YMapEvent<unknown>, tr: Y.Transaction) => void) | null = null;

function detachDebugMapObserver() {
  if (draftMap && debugMapObserver) {
    console.log("[room] debug observer detach", {
      roomName: activeRoomName,
      mapClientID: ydoc?.clientID,
    });
    draftMap.unobserve(debugMapObserver);
    debugMapObserver = null;
  }
}

function attachDebugMapObserver() {
  if (!draftMap) return;
  detachDebugMapObserver();
  debugMapObserver = (event, tr) => {
    console.log("[room] observer", {
      roomName: activeRoomName,
      origin: tr.origin,
      keysChanged: [...event.keysChanged],
      mapClientID: ydoc?.clientID,
    });
  };
  console.log("[room] debug observer attach", {
    roomName: activeRoomName,
    mapClientID: ydoc?.clientID,
  });
  draftMap.observe(debugMapObserver);
}

function emitDraftMap() {
  if (!draftMap) return;
  for (const listener of draftMapListeners) {
    listener(draftMap);
  }
}

function onProviderStatus(event: { connected: boolean }) {
  console.log("[room] status", event);
  status = { ...status, signalingConnected: event.connected };
  emitStatus();
}

function onProviderPeers(event: {
  added: string[];
  removed: string[];
  webrtcPeers: string[];
  bcPeers: string[];
}) {
  console.log("[room] peers", event);
  updatePeerCount(event.webrtcPeers, event.bcPeers);
}

function setPersistenceStatus(next: RoomPersistenceStatus) {
  if (persistenceStatus === next) return;
  persistenceStatus = next;
  for (const listener of persistenceListeners) {
    listener(persistenceStatus);
  }
}

function onPersistenceSynced() {
  if (persistenceStatus === "ready") return;
  setPersistenceStatus("ready");
}

function startIndexedDbPersistence(roomName: string, doc: Y.Doc): void {
  if (typeof indexedDB === "undefined") {
    setPersistenceStatus("unavailable");
    return;
  }

  try {
    idbPersistence = new IndexeddbPersistence(roomName, doc);
    idbPersistence.on("synced", onPersistenceSynced);
    void idbPersistence.whenSynced
      .then(onPersistenceSynced)
      .catch(() => {
        if (idbPersistence) {
          idbPersistence.off("synced", onPersistenceSynced);
          void idbPersistence.destroy();
          idbPersistence = null;
        }
        setPersistenceStatus("unavailable");
      });
  } catch {
    idbPersistence = null;
    setPersistenceStatus("unavailable");
  }
}

export function getRoomPersistenceStatus(): RoomPersistenceStatus {
  return persistenceStatus;
}

/** True once IndexedDB has synced or persistence is unavailable — safe to read/write the doc. */
export function isRoomPersistenceReady(): boolean {
  if (!activeRoomName) return false;
  return persistenceStatus === "ready" || persistenceStatus === "unavailable";
}

export function subscribeRoomPersistence(
  listener: (status: RoomPersistenceStatus) => void,
): () => void {
  persistenceListeners.add(listener);
  listener(persistenceStatus);
  return () => persistenceListeners.delete(listener);
}

function teardownProvider() {
  if (provider) {
    console.log("[room] provider destroy", { roomName: activeRoomName });
    provider.off("status", onProviderStatus);
    provider.off("peers", onProviderPeers);
    provider.destroy();
    provider = null;
  }
  if (idbPersistence) {
    console.log("[room] idb persistence destroy", { roomName: activeRoomName });
    idbPersistence.off("synced", onPersistenceSynced);
    void idbPersistence.destroy();
    idbPersistence = null;
  }
  if (ydoc) {
    console.log("[room] ydoc destroy", { roomName: activeRoomName, clientID: ydoc.clientID });
    ydoc.destroy();
    ydoc = null;
  }
  draftMap = null;
  playersMap = null;
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
    series: normalizeSeries(map.get("series")),
  };
}

export function hasSharedDraftKeys(map: Y.Map<unknown>): boolean {
  return map.size > 0;
}

function normalizeSharedPlayerEntry(raw: unknown): SharedPlayerEntry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as { name?: unknown; tierSeed?: unknown };
  if (typeof obj.name !== "string" || typeof obj.tierSeed !== "string") {
    return null;
  }
  return { name: obj.name, tierSeed: obj.tierSeed };
}

export function readSharedPlayers(map: Y.Map<unknown>): SharedPlayersByRole {
  const out: SharedPlayersByRole = {};
  for (let i = 0; i < 5; i++) {
    const entry = normalizeSharedPlayerEntry(map.get(String(i)));
    if (entry) out[i] = entry;
  }
  return out;
}

/**
 * Writes one role slot inside a transaction. Any client may update any slot (last-write-wins).
 * connectRoom never calls this.
 */
export function writeSharedPlayer(
  roleIndex: number,
  entry: SharedPlayerEntry,
): void {
  if (!ydoc || !playersMap || !isRoomPersistenceReady()) {
    console.log("[room] writeSharedPlayer SKIP (no map)", {
      roleIndex,
      hasYdoc: !!ydoc,
      hasMap: !!playersMap,
    });
    return;
  }
  if (roleIndex < 0 || roleIndex > 4) return;
  console.log("[room] writeSharedPlayer", {
    roomName: activeRoomName,
    roleIndex,
    origin: LOCAL_ORIGIN,
    mapClientID: ydoc.clientID,
  });
  ydoc.transact(() => {
    playersMap!.set(String(roleIndex), entry);
  }, LOCAL_ORIGIN);
}

export function getPlayersMap(): Y.Map<unknown> | null {
  return playersMap;
}

function emitPlayersMap() {
  if (!playersMap) return;
  for (const listener of playersMapListeners) {
    listener(playersMap);
  }
}

export function subscribePlayersMap(
  listener: (map: Y.Map<unknown>) => void,
): () => void {
  playersMapListeners.add(listener);
  if (playersMap) listener(playersMap);
  return () => playersMapListeners.delete(listener);
}

/**
 * Writes shared draft fields inside a transaction. Only for explicit user actions.
 * connectRoom never calls this.
 */
export function writeSharedDraft(payload: SharedDraftPayload): void {
  if (!ydoc || !draftMap || !isRoomPersistenceReady()) {
    console.log("[room] write SKIP (no map)", {
      hasYdoc: !!ydoc,
      hasMap: !!draftMap,
      keys: ["profileKey", "picks", "bans", "series"],
    });
    return;
  }
  console.log("[room] write", {
    roomName: activeRoomName,
    origin: LOCAL_ORIGIN,
    keys: ["profileKey", "picks", "bans", "series"],
    mapClientID: ydoc.clientID,
  });
  ydoc.transact(() => {
    draftMap!.set("profileKey", payload.profileKey);
    draftMap!.set("picks", payload.picks);
    draftMap!.set("bans", payload.bans);
    draftMap!.set("series", payload.series);
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
  if (activeRoomName === roomName && provider) {
    console.log("[room] connect SKIP (already connected)", { roomName });
    return;
  }

  disconnectRoom();

  activeRoomName = roomName;
  ydoc = new Y.Doc();
  draftMap = ydoc.getMap("draft");
  playersMap = ydoc.getMap("players");

  setPersistenceStatus("loading");
  startIndexedDbPersistence(roomName, ydoc);

  console.log("[room] provider create", {
    roomName,
    clientID: ydoc.clientID,
    signaling: DEFAULT_SIGNALING_URLS,
  });

  provider = new WebrtcProvider(roomName, ydoc, {
    signaling: [...DEFAULT_SIGNALING_URLS],
  });

  provider.on("status", onProviderStatus);
  provider.on("peers", onProviderPeers);

  attachDebugMapObserver();

  status = {
    signalingConnected: provider.connected,
    peerCount: 0,
  };
  emitStatus();
  emitDraftMap();
  emitPlayersMap();
}

export function disconnectRoom(options?: DisconnectRoomOptions): void {
  const roomNameToClear =
    options?.clearIndexedDb && activeRoomName ? activeRoomName : null;

  detachDebugMapObserver();
  teardownProvider();
  setPersistenceStatus("idle");

  if (roomNameToClear) {
    void clearDocument(roomNameToClear).catch(() => {
      /* IndexedDB may be unavailable — ignore */
    });
  }
}

/** Connect or disconnect from the WebRTC room based on the current URL hash. */
export function syncRoomFromLocation(): void {
  if (typeof window === "undefined") return;
  const rid =
    extractRidFromHash(window.location.hash) ??
    extractRidFromHash(window.location.href);
  if (!rid) {
    disconnectRoom();
    return;
  }
  connectRoom(deriveRoomNameFromRid(rid));
}

export function subscribeRoomStatus(listener: (s: RoomStatus) => void): () => void {
  statusListeners.add(listener);
  listener(status);
  return () => statusListeners.delete(listener);
}

export function subscribeDraftMap(listener: (map: Y.Map<unknown>) => void): () => void {
  console.log("[room] subscribeDraftMap attach");
  draftMapListeners.add(listener);
  if (draftMap) {
    console.log("[room] subscribeDraftMap immediate map", {
      roomName: activeRoomName,
      mapClientID: ydoc?.clientID,
    });
    listener(draftMap);
  }
  return () => {
    console.log("[room] subscribeDraftMap detach");
    draftMapListeners.delete(listener);
  };
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
    map.set("series", payload.series);
  }, origin);
}

/** Test helper: write one player slot to a doc without connectRoom. */
export function writeSharedPlayerToDoc(
  doc: Y.Doc,
  roleIndex: number,
  entry: SharedPlayerEntry,
  origin: unknown = LOCAL_ORIGIN,
): void {
  const map = doc.getMap("players");
  doc.transact(() => {
    map.set(String(roleIndex), entry);
  }, origin);
}

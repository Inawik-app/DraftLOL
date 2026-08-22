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
  /** True after 30s in a room with zero peers detected. */
  noPeersTimedOut: boolean;
};

export const NO_PEERS_TIMEOUT_MS = 30_000;

export const NO_PEERS_TIMEOUT_MSG =
  "Aucun coéquipier détecté depuis 30 secondes. Vérifie que tout le monde ouvre exactement le même lien, qu'aucun bloqueur ne coupe WebRTC, puis réessaie « Quitter la salle » et repartage le lien.";

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

let status: RoomStatus = {
  signalingConnected: false,
  peerCount: 0,
  noPeersTimedOut: false,
};

let noPeersTimer: ReturnType<typeof setTimeout> | null = null;

function clearNoPeersTimer() {
  if (noPeersTimer != null) {
    clearTimeout(noPeersTimer);
    noPeersTimer = null;
  }
}

function startNoPeersTimer() {
  clearNoPeersTimer();
  status = { ...status, noPeersTimedOut: false };
  emitStatus();
  noPeersTimer = setTimeout(() => {
    if (activeRoomName && status.peerCount === 0) {
      status = { ...status, noPeersTimedOut: true };
      emitStatus();
    }
  }, NO_PEERS_TIMEOUT_MS);
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

function updatePeerCount(webrtcPeers: string[], bcPeers: string[]) {
  const peerCount = webrtcPeers.length + bcPeers.length;
  status = { ...status, peerCount };
  if (peerCount > 0) {
    status = { ...status, noPeersTimedOut: false };
    clearNoPeersTimer();
  }
  emitStatus();
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

function teardownProvider() {
  clearNoPeersTimer();
  if (provider) {
    console.log("[room] provider destroy", { roomName: activeRoomName });
    provider.off("status", onProviderStatus);
    provider.off("peers", onProviderPeers);
    provider.destroy();
    provider = null;
  }
  if (ydoc) {
    console.log("[room] ydoc destroy", { roomName: activeRoomName, clientID: ydoc.clientID });
    ydoc.destroy();
    ydoc = null;
  }
  draftMap = null;
  activeRoomName = null;
  status = { signalingConnected: false, peerCount: 0, noPeersTimedOut: false };
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
  if (!ydoc || !draftMap) {
    console.log("[room] write SKIP (no map)", {
      hasYdoc: !!ydoc,
      hasMap: !!draftMap,
      keys: ["profileKey", "picks", "bans"],
    });
    return;
  }
  console.log("[room] write", {
    roomName: activeRoomName,
    origin: LOCAL_ORIGIN,
    keys: ["profileKey", "picks", "bans"],
    mapClientID: ydoc.clientID,
  });
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
  if (activeRoomName === roomName && provider) {
    console.log("[room] connect SKIP (already connected)", { roomName });
    return;
  }

  disconnectRoom();

  activeRoomName = roomName;
  ydoc = new Y.Doc();
  draftMap = ydoc.getMap("draft");

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
    noPeersTimedOut: false,
  };
  emitStatus();
  emitDraftMap();
  startNoPeersTimer();
}

export function disconnectRoom(): void {
  detachDebugMapObserver();
  teardownProvider();
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
  }, origin);
}

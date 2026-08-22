import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  connectRoom,
  disconnectRoom,
  getDraftMap,
  readSharedDraft,
  writeSharedDraftToDoc,
} from "./room";
import {
  deriveRoomNameFromRid,
  encodeRoom,
  generateRoomId,
  hashRoomId,
} from "./token";
import type { RoomState } from "./token";

function minimalRoomState(rid: string): RoomState {
  return {
    profileKey: "teamfight",
    picks: {
      blue: [null, null, null, null, null],
      red: [null, null, null, null, null],
    },
    bans: {
      blue: ["", "", "", "", ""],
      red: ["", "", "", "", ""],
    },
    players: [0, 1, 2, 3, 4].map(() => ({
      name: "",
      opgg: "",
      tiers: {},
      stats: {},
    })),
    rid,
  };
}

describe("roomName from rid", () => {
  it("deux tokens avec le même rid produisent le même roomName", () => {
    const rid = "550e8400-e29b-41d4-a716-446655440000";
    const base = minimalRoomState(rid);
    const tokenA = encodeRoom(base);
    const tokenB = encodeRoom({
      ...base,
      bans: { ...base.bans, blue: ["Yasuo", "", "", "", ""] },
    });
    expect(deriveRoomNameFromRid(rid)).toBe(hashRoomId(rid));
    expect(tokenA).not.toBe(tokenB);
  });

  it("deux rid différents produisent des roomName différents", () => {
    const ridA = generateRoomId();
    const ridB = generateRoomId();
    expect(deriveRoomNameFromRid(ridA)).not.toBe(deriveRoomNameFromRid(ridB));
  });
});

describe("room join semantics", () => {
  it("doc B vide qui rejoint ne doit pas écraser les picks de doc A", () => {
    const docA = new Y.Doc();
    writeSharedDraftToDoc(docA, {
      profileKey: "teamfight",
      picks: {
        blue: ["Ahri", "Zed", "Lux", "", ""],
        red: ["", "", "", "", ""],
      },
      bans: {
        blue: ["", "", "", "", ""],
        red: ["", "", "", "", ""],
      },
    });

    const docB = new Y.Doc();
    expect(docB.getMap("draft").size).toBe(0);

    // Simule la sync réseau : B reçoit l'état de A sans écrire localement.
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

    const remote = readSharedDraft(docB.getMap("draft"));
    expect(remote?.picks.blue.filter(Boolean)).toEqual(["Ahri", "Zed", "Lux"]);
  });

  it("connectRoom n'écrit jamais dans la Y.Map", () => {
    connectRoom("test-room-no-write");
    expect(getDraftMap()?.size ?? 0).toBe(0);
    disconnectRoom();
  });
});

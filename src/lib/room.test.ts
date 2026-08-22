import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { EMPTY_SERIES } from "@/lib/series";
import {
  connectRoom,
  disconnectRoom,
  getDraftMap,
  readSharedDraft,
  readSharedPlayers,
  writeSharedDraftToDoc,
  writeSharedPlayerToDoc,
} from "./room";
import {
  deriveRoomNameFromRid,
  generateRoomId,
  hashRoomId,
} from "./token";
import { encodeTierSeed } from "./tierSeed";

describe("roomName from rid", () => {
  it("deux rid différents produisent des roomName différents", () => {
    const ridA = generateRoomId();
    const ridB = generateRoomId();
    expect(deriveRoomNameFromRid(ridA)).toBe(hashRoomId(ridA));
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
      series: { ...EMPTY_SERIES },
    });

    const docB = new Y.Doc();
    expect(docB.getMap("draft").size).toBe(0);

    // Simule la sync réseau : B reçoit l'état de A sans écrire localement.
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

    const remote = readSharedDraft(docB.getMap("draft"));
    expect(remote?.picks.blue.filter(Boolean)).toEqual(["Ahri", "Zed", "Lux"]);
  });

  it("connectRoom n'écrit jamais dans la Y.Map draft", () => {
    connectRoom("test-room-no-write");
    expect(getDraftMap()?.size ?? 0).toBe(0);
    disconnectRoom();
  });
});

describe("shared players map", () => {
  const emptySeed = encodeTierSeed({ S: [], A: [], B: [], D: [] });

  it("un client rejoignant reçoit les tier lists publiées sans écraser les autres", () => {
    const docA = new Y.Doc();
    writeSharedPlayerToDoc(docA, 0, {
      name: "Alice",
      tierSeed: emptySeed,
    });
    writeSharedPlayerToDoc(docA, 2, {
      name: "Bob",
      tierSeed: emptySeed,
    });

    const docB = new Y.Doc();
    expect(docB.getMap("players").size).toBe(0);

    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

    const received = readSharedPlayers(docB.getMap("players"));
    expect(received[0]?.name).toBe("Alice");
    expect(received[2]?.name).toBe("Bob");
    expect(received[1]).toBeUndefined();

    writeSharedPlayerToDoc(
      docB,
      1,
      { name: "Carol", tierSeed: emptySeed },
      "local",
    );

    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB));

    const merged = readSharedPlayers(docA.getMap("players"));
    expect(merged[0]?.name).toBe("Alice");
    expect(merged[1]?.name).toBe("Carol");
    expect(merged[2]?.name).toBe("Bob");
  });
});

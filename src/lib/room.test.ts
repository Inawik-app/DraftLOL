import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  connectRoom,
  disconnectRoom,
  getDraftMap,
  readSharedDraft,
  writeSharedDraftToDoc,
} from "./room";

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

import { describe, expect, it } from "vitest";
import {
  extractRidFromHash,
  extractRoomIdFromToken,
  extractToken,
  formatRoomHash,
  generateRoomId,
  hashRoomId,
} from "./token";

describe("token / room id", () => {
  it("extractRidFromHash lit un uuid dans #r=", () => {
    const rid = "550e8400-e29b-41d4-a716-446655440000";
    expect(extractRidFromHash(formatRoomHash(rid))).toBe(rid);
    expect(
      extractRidFromHash(`https://draft.example/#r=${rid}`),
    ).toBe(rid);
  });

  it("extractRoomIdFromToken lit le champ i d'un legacy DRAFT1", async () => {
    const lz = await import("lz-string");
    const rid = "550e8400-e29b-41d4-a716-446655440000";
    const token =
      "DRAFT1." +
      lz.compressToEncodedURIComponent(JSON.stringify({ i: rid, p: "teamfight" }));
    expect(extractRoomIdFromToken(token)).toBe(rid);
    expect(extractRidFromHash(`#r=${encodeURIComponent(token)}`)).toBe(rid);
  });

  it("deriveRoomNameFromRid est stable", () => {
    const rid = generateRoomId();
    expect(hashRoomId(rid)).toHaveLength(16);
  });

  it("extractToken reconnaît TL1 et DRAFT1", () => {
    const tl = "TL1.abc|def|ghi";
    expect(extractToken(`https://draft.board/#r=${tl}`)).toBe(tl);
    expect(extractToken("DRAFT1.legacyPayload")).toBe("DRAFT1.legacyPayload");
  });
});

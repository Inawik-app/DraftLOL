import { describe, expect, it } from "vitest";
import { isLocalStorageAvailable } from "./storage";

describe("isLocalStorageAvailable", () => {
  it("returns true when localStorage works", () => {
    expect(isLocalStorageAvailable()).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { deriveTags } from "./deriveTags";

describe("deriveTags", () => {
  it("dérive un tank pur", () => {
    const tags = deriveTags({
      info: { attack: 2, magic: 3, defense: 9 },
      tags: ["Tank"],
    });
    expect(tags).toEqual(
      expect.arrayContaining(["ap", "frontline", "engage"]),
    );
    expect(tags).not.toContain("ad");
    expect(tags).not.toContain("dps");
    expect(tags).not.toContain("waveclear");
  });

  it("dérive un mage", () => {
    const tags = deriveTags({
      info: { attack: 2, magic: 9, defense: 3 },
      tags: ["Mage"],
    });
    expect(tags).toEqual(expect.arrayContaining(["ap", "waveclear"]));
    expect(tags).not.toContain("ad");
    expect(tags).not.toContain("frontline");
    expect(tags).not.toContain("dps");
  });

  it("dérive un marksman", () => {
    const tags = deriveTags({
      info: { attack: 9, magic: 1, defense: 2 },
      tags: ["Marksman"],
    });
    expect(tags).toEqual(expect.arrayContaining(["ad", "dps"]));
    expect(tags).not.toContain("ap");
    expect(tags).not.toContain("waveclear");
    expect(tags).not.toContain("frontline");
  });

  it("dérive un champion hybride (attack === magic)", () => {
    const tags = deriveTags({
      info: { attack: 6, magic: 6, defense: 4 },
      tags: ["Fighter", "Mage"],
    });
    expect(tags).toEqual(
      expect.arrayContaining(["ad", "ap", "dps", "waveclear"]),
    );
  });
});

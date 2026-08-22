import { describe, expect, it } from "vitest";
import {
  buildOpggUrl,
  displayNameFromOpggUrl,
  normalizeOpggInput,
} from "./opggLink";

describe("opggLink", () => {
  it("construit une URL op.gg depuis un Riot ID", () => {
    const url = buildOpggUrl("Faker", "KR1", "EUW");
    expect(url).toBe(
      "https://op.gg/lol/summoners/euw/Faker-KR1",
    );
  });

  it("normalise un Riot ID en URL et pseudo", () => {
    const r = normalizeOpggInput("Caps#EUW", "EUW", "");
    expect(r).toEqual({
      name: "Caps",
      opgg: "https://op.gg/lol/summoners/euw/Caps-EUW",
    });
  });

  it("accepte une URL op.gg complète", () => {
    const url = "https://op.gg/lol/summoners/euw/Alice-EUW1";
    const r = normalizeOpggInput(url, "EUW", "");
    expect(r).toEqual({ name: "Alice", opgg: url });
  });

  it("chaîne vide efface le lien", () => {
    expect(normalizeOpggInput("", "EUW", "Bob")).toEqual({
      name: "Bob",
      opgg: "",
    });
  });

  it("rejette une entrée non reconnue", () => {
    expect(normalizeOpggInput("pas-un-lien", "EUW")).toEqual({ error: true });
  });

  it("extrait un pseudo depuis une URL op.gg", () => {
    expect(
      displayNameFromOpggUrl(
        "https://op.gg/lol/summoners/euw/Hide%20on%20bush-KR1",
      ),
    ).toBe("Hide on bush");
  });
});

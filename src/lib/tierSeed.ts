import { packChampionKeys, unpackChampionKeys } from "./codec";
import { extractToken } from "./token";

export const TIER_SEED_PREFIX = "TL1.";
const TIER_SEPARATOR = "|";

export type TierSeedLists = {
  S: number[];
  A: number[];
  B: number[];
  D: number[];
};

export function emptyTierSeedLists(): TierSeedLists {
  return { S: [], A: [], B: [], D: [] };
}

export function encodeTierSeed(lists: TierSeedLists): string {
  const s = packChampionKeys(lists.S);
  const a = packChampionKeys(lists.A);
  const b = packChampionKeys(lists.B);
  const d = packChampionKeys(lists.D);
  return `${TIER_SEED_PREFIX}${s}${TIER_SEPARATOR}${a}${TIER_SEPARATOR}${b}${TIER_SEPARATOR}${d}`;
}

export function decodeTierSeed(
  input: string,
): { ok: true; lists: TierSeedLists } | { ok: false; reason: string } {
  try {
    const bare = extractToken(input) ?? input.trim();
    if (!bare) {
      return {
        ok: false,
        reason: "Seed vide. Colle un token commençant par TL1.",
      };
    }

    if (!bare.startsWith(TIER_SEED_PREFIX)) {
      return {
        ok: false,
        reason:
          "Préfixe absent. Le seed doit commencer par TL1. — recopie-le en entier.",
      };
    }

    const payload = bare.slice(TIER_SEED_PREFIX.length);
    if (!payload && payload !== "") {
      return {
        ok: false,
        reason: "Payload manquant après TL1. — seed tronqué.",
      };
    }

    const parts = payload.split(TIER_SEPARATOR);
    if (parts.length !== 3 && parts.length !== 4) {
      return {
        ok: false,
        reason:
          "Structure invalide : le seed TL1 doit contenir trois ou quatre listes (S, A, B[, D]) séparées par |.",
      };
    }

    const [sPart, aPart, bPart, dPart = ""] = parts;
    if (
      sPart.includes(TIER_SEPARATOR) ||
      aPart.includes(TIER_SEPARATOR) ||
      bPart.includes(TIER_SEPARATOR) ||
      dPart.includes(TIER_SEPARATOR)
    ) {
      return {
        ok: false,
        reason: "Structure invalide dans le seed TL1.",
      };
    }

    const S = unpackChampionKeys(sPart);
    const A = unpackChampionKeys(aPart);
    const B = unpackChampionKeys(bPart);
    const D = dPart.length > 0 ? unpackChampionKeys(dPart) : [];

    for (const [label, part, keys] of [
      ["S", sPart, S],
      ["A", aPart, A],
      ["B", bPart, B],
      ["D", dPart, D],
    ] as const) {
      if (part.length > 0 && keys.length === 0) {
        return {
          ok: false,
          reason: `Liste ${label} illisible ou corrompue dans le seed TL1.`,
        };
      }
    }

    return { ok: true, lists: { S, A, B, D } };
  } catch {
    return {
      ok: false,
      reason: "Seed TL1 illisible. Recopie-le en entier, préfixe compris.",
    };
  }
}

export const OPGG_REGIONS = [
  "EUW",
  "EUNE",
  "NA",
  "KR",
  "BR",
  "LAN",
  "LAS",
  "OCE",
  "TR",
  "RU",
  "JP",
  "PH",
  "SG",
  "TH",
  "TW",
  "VN",
] as const;

export type OpggRegion = (typeof OPGG_REGIONS)[number];

export type RoleProfile = {
  name: string;
  opgg: string;
};

export function isOpggRegion(value: string): value is OpggRegion {
  return (OPGG_REGIONS as readonly string[]).includes(value);
}

export function buildOpggUrl(
  gameName: string,
  tagLine: string,
  region: OpggRegion,
): string {
  const slug = `${gameName.trim()}-${tagLine.trim()}`;
  return `https://op.gg/lol/summoners/${region.toLowerCase()}/${encodeURIComponent(slug)}`;
}

/** Extracts a display name from a known op.gg summoner URL, if possible. */
export function displayNameFromOpggUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("op.gg")) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const slug = parts[parts.length - 1];
    if (!slug) return null;
    const decoded = decodeURIComponent(slug);
    const dash = decoded.lastIndexOf("-");
    if (dash <= 0) return decoded;
    return decoded.slice(0, dash);
  } catch {
    return null;
  }
}

/**
 * Normalizes pasted input (full op.gg URL or Riot ID pseudo#tag) into stored URL + display name.
 * Returns null when the input is non-empty but unrecognized.
 */
export function normalizeOpggInput(
  input: string,
  region: OpggRegion,
  currentName = "",
): { name: string; opgg: string } | { error: true } | null {
  const trimmed = input.trim();
  if (!trimmed) return { name: currentName, opgg: "" };

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      if (!url.hostname.includes("op.gg")) return { error: true };
      const derived = displayNameFromOpggUrl(trimmed);
      return {
        name: currentName.trim() || derived || currentName,
        opgg: url.toString(),
      };
    } catch {
      return { error: true };
    }
  }

  const hashIdx = trimmed.indexOf("#");
  if (hashIdx > 0) {
    const gameName = trimmed.slice(0, hashIdx).trim();
    const tagLine = trimmed.slice(hashIdx + 1).trim();
    if (!gameName || !tagLine) return { error: true };
    return {
      name: currentName.trim() || gameName,
      opgg: buildOpggUrl(gameName, tagLine, region),
    };
  }

  return { error: true };
}

export function emptyRoleProfiles(): RoleProfile[] {
  return [0, 1, 2, 3, 4].map(() => ({ name: "", opgg: "" }));
}

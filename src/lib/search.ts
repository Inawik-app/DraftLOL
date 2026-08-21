function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function subsequenceScore(query: string, name: string): number | null {
  if (!query) return 0;
  const n = normalize(name);
  const s = normalize(query);
  if (!s) return 0;

  let i = 0;
  let gaps = 0;
  let last = -1;
  for (const ch of s) {
    const at = n.indexOf(ch, i);
    if (at === -1) return null;
    if (last >= 0) gaps += at - last - 1;
    last = at;
    i = at + 1;
  }

  let score = 1000 - gaps * 8 - n.length;
  if (n.startsWith(s)) score += 600;
  return score;
}

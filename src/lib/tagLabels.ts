import type { Tag } from "@/lib/types";

export const TAG_LABEL: Record<Tag, string> = {
  frontline: "Frontline",
  engage: "Engage",
  disengage: "Peel/Disengage",
  poke: "Poke",
  burst: "Burst",
  dps: "DPS soutenu",
  ap: "AP",
  ad: "AD",
  waveclear: "Waveclear",
  pick: "Pick/Catch",
  dive: "Dive",
  scaling: "Scaling",
  mobility: "Mobilité",
  utility: "Utilitaire",
  splitpush: "Splitpush",
};

export function scoreColor(score: number): string {
  if (score >= 72) return "var(--ok)";
  if (score >= 48) return "var(--warn)";
  return "var(--bad)";
}

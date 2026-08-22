"use client";

import { useMemo } from "react";
import { championIconUrl } from "@/lib/ddragon";
import { scoreComp } from "@/lib/score";
import { TAG_LABEL } from "@/lib/tagLabels";
import { RoleTags } from "@/components/RoleTags";
import type { HoverFocus } from "@/components/ChampionDetail";
import type { Champion, Evaluation, Pick, Player, Profile } from "@/lib/types";

type Props = {
  version: string;
  hover: HoverFocus | null;
  picks: { blue: (Champion | null)[]; red: (Champion | null)[] };
  players: Player[];
  profile: Profile;
  allyEval: Evaluation;
};

function toScorePicks(
  team: (Champion | null)[],
  players: Player[],
): Pick[] {
  const out: Pick[] = [];
  team.forEach((champ, roleIdx) => {
    if (!champ) return;
    const tier = players[roleIdx]?.tiers[champ.id] ?? null;
    out.push({ champ, tier, roleIdx });
  });
  return out;
}

/** Compact champion detail for the bottom analysis bar — fixed height slot. */
export function ChampionDetailCompact({
  version,
  hover,
  picks,
  players,
  profile,
  allyEval,
}: Props) {
  const champ = hover?.champ ?? null;

  const delta = useMemo(() => {
    if (!hover || hover.team !== "blue") return null;
    const { index, champ: c } = hover;
    const without = picks.blue.map((p, i) => (i === index ? null : p));
    const withHim = picks.blue.map((p, i) => (i === index ? c : p));
    return (
      scoreComp(toScorePicks(withHim, players), profile).score -
      scoreComp(toScorePicks(without, players), profile).score
    );
  }, [hover, picks.blue, players, profile]);

  if (!champ || !hover) {
    return (
      <div style={{ height: "100%" }}>
        <div className="font-cond text-[10px] tracking-[0.1em] text-dim">
          Survole un champion
        </div>
        <p className="mt-1 text-[10px] leading-snug text-dim">
          Détail, tags et impact sur le score dans la grille centrale.
        </p>
      </div>
    );
  }

  const lowTags = new Set(
    allyEval.rows.filter((r) => r.status === "low").map((r) => r.tag),
  );
  const gaps = allyEval.rows
    .filter((r) => r.status === "low" && !champ.tags.includes(r.tag))
    .map((r) => r.tag);

  const player = players[hover.index];
  const tier =
    hover.team === "blue" ? (player?.tiers[champ.id] ?? null) : null;

  return (
    <div className="overflow-hidden" style={{ height: "100%" }}>
      <div className="flex items-start gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={championIconUrl(version, champ.id)}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 border border-line"
        />
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="truncate font-cond text-[15px] leading-none">
            {champ.name}
          </div>
          <div className="truncate text-[10px] text-dim">{champ.title}</div>
          <RoleTags championId={champ.id} />
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-0.5 overflow-hidden">
        {champ.tags.slice(0, 8).map((t) => (
          <span
            key={t}
            className={`font-cond border px-1 py-px text-[8px] tracking-[0.06em] ${
              lowTags.has(t) ? "border-ok text-ok" : "border-line text-dim"
            }`}
          >
            {TAG_LABEL[t]}
          </span>
        ))}
      </div>

      {gaps.length > 0 ? (
        <p className="mt-1 truncate text-[9px] text-dim">
          Manque : {gaps.slice(0, 4).map((t) => TAG_LABEL[t]).join(", ")}
        </p>
      ) : null}

      {delta !== null ? (
        <p className="mt-1 font-cond text-[13px]" style={{ color: delta >= 0 ? "var(--ok)" : "var(--bad)" }}>
          {delta >= 0 ? "+" : ""}
          {Math.round(delta)} pts
          {tier ? (
            <span className="ml-1 text-[10px] text-gold">Tier {tier}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

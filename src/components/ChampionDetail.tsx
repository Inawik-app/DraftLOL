"use client";

import { useMemo } from "react";
import { championIconUrl } from "@/lib/ddragon";
import { matchupFromStats } from "@/lib/playerStats";
import { scoreComp } from "@/lib/score";
import { TAG_LABEL } from "@/lib/tagLabels";
import type {
  Champion,
  Evaluation,
  Pick,
  Player,
  Profile,
} from "@/lib/types";
import type { TeamId } from "@/state/useDraft";

export type HoverFocus = {
  team: TeamId;
  index: number;
  champ: Champion;
};

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

export function ChampionDetail({
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
      <div className="mt-3.5 min-h-[150px] border-t border-line pt-2.5">
        <div className="font-cond text-[11px] tracking-[0.1em] text-dim">
          Survole un champion
        </div>
        <p className="mt-1.5 text-xs text-dim">
          Ses forces, ce qu&apos;il ne couvre pas dans la compo actuelle et son
          impact sur le score s&apos;affichent ici.
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

  const enemy = picks.red[hover.index];
  const player = players[hover.index];
  const tier =
    hover.team === "blue"
      ? (player?.tiers[champ.id] ?? null)
      : null;
  const matchup =
    hover.team === "blue"
      ? matchupFromStats(
          player?.stats,
          champ.id,
          enemy?.id,
          enemy?.name,
        )
      : null;

  return (
    <div className="mt-3.5 min-h-[150px] border-t border-line pt-2.5">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={championIconUrl(version, champ.id)}
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 border border-line"
        />
        <div>
          <div className="font-cond text-[19px] leading-none">{champ.name}</div>
          <div className="text-[11px] text-dim">{champ.title}</div>
        </div>
      </div>

      <div className="mt-2">
        <div className="font-cond mb-0.5 text-[10px] tracking-[0.12em] text-dim">
          Apporte
        </div>
        <div className="flex flex-wrap gap-0.5">
          {champ.tags.map((t) => (
            <span
              key={t}
              className={`font-cond border px-1 py-px text-[9px] tracking-[0.06em] ${
                lowTags.has(t)
                  ? "border-ok text-ok"
                  : "border-line text-dim"
              }`}
            >
              {TAG_LABEL[t]}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2">
        <div className="font-cond mb-0.5 text-[10px] tracking-[0.12em] text-dim">
          Ne couvre pas
        </div>
        {gaps.length ? (
          <div className="flex flex-wrap gap-0.5">
            {gaps.map((t) => (
              <span
                key={t}
                className="font-cond border border-line px-1 py-px text-[9px] tracking-[0.06em] text-dim"
              >
                {TAG_LABEL[t]}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[11px] text-dim">
            Rien de critique pour ce profil.
          </span>
        )}
      </div>

      {delta !== null && (
        <div className="mt-2">
          <div className="font-cond mb-0.5 text-[10px] tracking-[0.12em] text-dim">
            Impact sur le score
          </div>
          <span
            className="font-cond text-[17px]"
            style={{ color: delta >= 0 ? "var(--ok)" : "var(--bad)" }}
          >
            {delta >= 0 ? "+" : ""}
            {Math.round(delta)} pts
          </span>
          {tier && (
            <span className="ml-2 text-[11px] text-gold">
              Tier {tier} pour ce joueur — pénalité de profil réduite.
            </span>
          )}
        </div>
      )}

      {matchup && (
        <div className="mt-2">
          <div className="font-cond mb-0.5 text-[10px] tracking-[0.12em] text-dim">
            Ton historique
          </div>
          <span
            className="text-sm"
            style={{
              color: matchup.weakSample
                ? "var(--dim)"
                : matchup.wr >= 52
                  ? "var(--ok)"
                  : matchup.wr >= 45
                    ? "var(--warn)"
                    : "var(--bad)",
            }}
          >
            {matchup.wr}% de winrate face à {matchup.vsName}
          </span>
          {matchup.games != null && (
            <span className="ml-1.5 text-[11px] text-dim">
              ({matchup.games} parties
              {matchup.weakSample ? " — échantillon faible" : ""})
            </span>
          )}
          {matchup.games == null && matchup.weakSample && (
            <span className="ml-1.5 text-[11px] text-dim">
              — échantillon faible
            </span>
          )}
        </div>
      )}
    </div>
  );
}

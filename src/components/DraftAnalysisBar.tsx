"use client";

import { useMemo } from "react";
import { TAG_LABEL, scoreColor } from "@/lib/tagLabels";
import { DRAFT_ANALYSIS_BAR_HEIGHT_PX, DRAFT_BOARD_WIDTH_PX } from "@/lib/draftLayout";
import type { HoverFocus } from "@/components/ChampionDetail";
import { ChampionDetailCompact } from "@/components/ChampionDetailCompact";
import type { Evaluation, Tag, Player, Profile } from "@/lib/types";
import type { Champion } from "@/lib/types";

type Props = {
  version: string;
  blueEval: Evaluation;
  redEval: Evaluation;
  profileTargets: Partial<Record<Tag, number>>;
  profile: Profile;
  hover: HoverFocus | null;
  picks: { blue: (Champion | null)[]; red: (Champion | null)[] };
  players: Player[];
};

export function DraftAnalysisBar({
  version,
  blueEval,
  redEval,
  profileTargets,
  profile,
  hover,
  picks,
  players,
}: Props) {
  const offProfile = (Object.keys(blueEval.counts) as Tag[]).filter(
    (t) => blueEval.counts[t] > 0 && profileTargets[t] == null,
  );

  const gaugeCols = useMemo(() => {
    const rows = blueEval.rows;
    const third = Math.ceil(rows.length / 3);
    return [rows.slice(0, third), rows.slice(third, third * 2), rows.slice(third * 2)];
  }, [blueEval.rows]);

  return (
    <section
      aria-label="Analyse de composition"
      className="mt-3.5 grid border border-line bg-panel"
      style={{
        width: `${DRAFT_BOARD_WIDTH_PX}px`,
        height: `${DRAFT_ANALYSIS_BAR_HEIGHT_PX}px`,
        gridTemplateColumns: "200px 1fr 340px",
      }}
      data-testid="draft-analysis-bar"
    >
      <div className="flex flex-col justify-center border-r border-line px-3 py-2">
        <ScoreBlock label="Bleu" score={blueEval.score} eval={blueEval} />
        <ScoreBlock label="Rouge" score={redEval.score} eval={redEval} compact />
      </div>

      <div className="overflow-hidden px-3 py-2">
        <div className="grid h-full grid-cols-3 gap-x-3">
          {gaugeCols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1 overflow-hidden">
              {col.map((row) => (
                <Gauge key={row.tag} row={row} />
              ))}
            </div>
          ))}
        </div>
        {offProfile.length > 0 ? (
          <div className="mt-1 flex flex-wrap items-center gap-1 overflow-hidden">
            <span className="font-cond text-[9px] tracking-[0.08em] text-dim">
              hors profil
            </span>
            {offProfile.map((t) => (
              <span
                key={t}
                className="font-cond border border-line px-1 py-px text-[8px] tracking-[0.06em] text-dim"
              >
                {TAG_LABEL[t]} ×{blueEval.counts[t]}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-1 max-h-[52px] overflow-hidden">
          {blueEval.notes.slice(0, 2).map((n, i) => (
            <div
              key={i}
              className={`truncate border-l-2 px-1 py-0.5 text-[10px] ${
                n.t === "bad"
                  ? "border-bad text-[#E4A2A0]"
                  : n.t === "warn"
                    ? "border-warn text-[#E0C48A]"
                    : n.t === "good"
                      ? "border-ok text-[#93D3B2]"
                      : "border-line text-dim"
              }`}
            >
              {n.m}
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden border-l border-line px-3 py-2">
        <ChampionDetailCompact
          version={version}
          hover={hover}
          picks={picks}
          players={players}
          profile={profile}
          allyEval={blueEval}
        />
      </div>
    </section>
  );
}

function ScoreBlock({
  label,
  score,
  eval: evaluation,
  compact = false,
}: {
  label: string;
  score: number;
  eval: Evaluation;
  compact?: boolean;
}) {
  const color = scoreColor(score);
  return (
    <div className={compact ? "mt-2" : ""}>
      <div className="flex items-baseline gap-2">
        <span
          className="font-cond text-[28px] leading-none"
          style={{ color }}
        >
          {Math.round(score)}
        </span>
        <span className="font-cond text-[10px] tracking-[0.1em] text-dim">
          {label}
          {!compact && evaluation.affinityBonus > 0.5 ? (
            <span className="ml-1 text-gold">
              +{Math.round(evaluation.affinityBonus)} aff.
            </span>
          ) : null}
        </span>
      </div>
      <div className="mt-1 h-[3px] bg-[#1A2434]">
        <i
          className="block h-full"
          style={{
            width: `${Math.min(100, Math.max(0, score))}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

function Gauge({ row }: { row: Evaluation["rows"][number] }) {
  const slots = Math.max(row.target, Math.ceil(row.have), 1);
  const count = Math.min(slots, 5);
  const needRounded = Math.round(row.need);

  return (
    <div className="grid grid-cols-[62px_1fr_24px] items-center gap-1">
      <span className="truncate font-cond text-[9px] tracking-[0.04em] text-dim">
        {TAG_LABEL[row.tag]}
      </span>
      <span className="flex gap-0.5">
        {Array.from({ length: count }, (_, i) => {
          const filled = i < row.have;
          const needed = i < needRounded;
          let cls = "h-[7px] flex-1 border border-[#1D2839] bg-[#18202D]";
          if (filled) {
            if (row.status === "low") {
              cls = "h-[7px] flex-1 border border-bad bg-bad";
            } else if (row.status === "high" && i >= needRounded) {
              cls = "h-[7px] flex-1 border border-warn bg-warn";
            } else {
              cls = "h-[7px] flex-1 border border-ok bg-ok";
            }
          } else if (needed) {
            cls =
              "h-[7px] flex-1 border border-dashed border-[#33445C] bg-[#18202D]";
          }
          return <span key={i} className={cls} />;
        })}
      </span>
      <span className="text-right text-[9px] text-dim">
        {row.have}/{row.target}
      </span>
    </div>
  );
}

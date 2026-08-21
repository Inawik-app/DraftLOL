"use client";

import { TAG_LABEL, scoreColor } from "@/lib/tagLabels";
import type { Evaluation, Tag } from "@/lib/types";

type Props = {
  evaluation: Evaluation;
  profileTargets: Partial<Record<Tag, number>>;
};

export function AnalysisPanel({ evaluation, profileTargets }: Props) {
  const color = scoreColor(evaluation.score);
  const offProfile = (Object.keys(evaluation.counts) as Tag[]).filter(
    (t) => evaluation.counts[t] > 0 && profileTargets[t] == null,
  );

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span
          className="font-cond text-[52px] leading-[0.85]"
          style={{ color }}
        >
          {Math.round(evaluation.score)}
        </span>
        <span className="font-cond text-[10px] tracking-[0.12em] text-dim">
          score compo bleue
          {evaluation.affinityBonus > 0.5 && (
            <>
              <br />
              <em className="not-italic text-gold">
                dont +{Math.round(evaluation.affinityBonus)} affinité
              </em>
            </>
          )}
        </span>
      </div>

      <div className="my-2 h-[3px] bg-[#1A2434]">
        <i
          className="block h-full transition-[width] duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, evaluation.score))}%`,
            background: color,
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {evaluation.rows.map((row) => (
          <Gauge key={row.tag} row={row} />
        ))}
      </div>

      {offProfile.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="font-cond mr-1 text-[11px] tracking-[0.1em] text-dim">
            hors profil
          </span>
          {offProfile.map((t) => (
            <span
              key={t}
              className="font-cond border border-line px-1 py-px text-[9px] tracking-[0.06em] text-dim"
            >
              {TAG_LABEL[t]} ×{evaluation.counts[t]}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2.5">
        {evaluation.notes.map((n, i) => (
          <div
            key={i}
            className={`mt-1 border-l-2 px-1.5 py-1 text-[11px] ${
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
        {!evaluation.notes.length && (
          <div className="mt-1 border-l-2 border-line px-1.5 py-1 text-[11px] text-dim">
            Choisis un premier champion pour lancer l&apos;analyse.
          </div>
        )}
      </div>
    </div>
  );
}

function Gauge({
  row,
}: {
  row: Evaluation["rows"][number];
}) {
  const slots = Math.max(row.target, Math.ceil(row.have), 1);
  const count = Math.min(slots, 5);
  const needRounded = Math.round(row.need);

  return (
    <div className="grid grid-cols-[78px_1fr_30px] items-center gap-1.5">
      <span className="font-cond text-[11px] tracking-[0.05em] text-dim">
        {TAG_LABEL[row.tag]}
      </span>
      <span className="flex gap-0.5">
        {Array.from({ length: count }, (_, i) => {
          const filled = i < row.have;
          const needed = i < needRounded;
          let cls =
            "h-[9px] flex-1 border border-[#1D2839] bg-[#18202D]";
          if (filled) {
            if (row.status === "low") {
              cls =
                "h-[9px] flex-1 border border-bad bg-bad";
            } else if (row.status === "high" && i >= needRounded) {
              cls =
                "h-[9px] flex-1 border border-warn bg-warn";
            } else {
              cls =
                "h-[9px] flex-1 border border-ok bg-ok";
            }
          } else if (needed) {
            cls =
              "h-[9px] flex-1 border border-dashed border-[#33445C] bg-[#18202D]";
          }
          return <span key={i} className={cls} />;
        })}
      </span>
      <span className="text-right text-[10px] text-dim">
        {row.have}/{row.target}
      </span>
    </div>
  );
}

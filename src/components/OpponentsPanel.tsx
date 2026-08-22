"use client";

import type { OpggRegion, RoleProfile } from "@/lib/opggLink";
import { RoleProfileRow } from "@/components/RoleProfileRow";
import { ROLE_LABELS } from "@/state/useDraft";

type Props = {
  open: boolean;
  onToggle: () => void;
  opponents: RoleProfile[];
  opggRegion: OpggRegion;
  onSetOpggRegion: (region: OpggRegion) => void;
  onUpdateOpponent: (index: number, patch: Partial<RoleProfile>) => void;
  embedded?: boolean;
};

export function OpponentsPanel({
  open,
  onToggle,
  opponents,
  opggRegion,
  onSetOpggRegion,
  onUpdateOpponent,
  embedded = false,
}: Props) {
  return (
    <section
      className={`border border-line bg-panel p-3 ${embedded ? "" : "mt-4"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-cond text-base">Adversaires</h2>
          <p className="font-cond text-[11px] tracking-[0.1em] text-dim">
            Pseudos et raccourcis op.gg locaux — vidés à chaque nouvelle draft.
            Aucune donnée n&apos;est lue depuis op.gg.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          {open ? "Masquer" : "Adversaires"}
        </button>
      </div>

      {open ? (
        <div className="mt-2 space-y-1">
          {ROLE_LABELS.map((label, i) => (
            <RoleProfileRow
              key={`opp-${label}`}
              roleLabel={label}
              teamLabel="équipe adverse"
              profile={opponents[i] ?? { name: "", opgg: "" }}
              region={opggRegion}
              showRegionSelector={i === 0}
              onRegionChange={onSetOpggRegion}
              onUpdate={(patch) => onUpdateOpponent(i, patch)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

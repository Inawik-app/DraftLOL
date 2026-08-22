"use client";

import type { OpggRegion, RoleProfile } from "@/lib/opggLink";
import { RoleProfileRow } from "@/components/RoleProfileRow";
import { ROLE_LABELS } from "@/state/useDraft";

type Props = {
  opponents: RoleProfile[];
  opggRegion: OpggRegion;
  onSetOpggRegion: (region: OpggRegion) => void;
  onUpdateOpponent: (index: number, patch: Partial<RoleProfile>) => void;
  embedded?: boolean;
};

export function OpponentsPanel({
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
      <div>
        <h2 className="font-cond text-base">Adversaires</h2>
        <p className="font-cond text-[11px] tracking-[0.1em] text-dim">
          Pseudos et raccourcis op.gg locaux — vidés à chaque nouvelle draft.
          Aucune donnée n&apos;est lue depuis op.gg.
        </p>
      </div>

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
    </section>
  );
}

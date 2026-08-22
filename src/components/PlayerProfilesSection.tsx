"use client";

import type { OpggRegion, RoleProfile } from "@/lib/opggLink";
import type { Player } from "@/lib/types";
import { OpponentsPanel } from "@/components/OpponentsPanel";
import { PlayersPanel } from "@/components/PlayersPanel";

type Props = {
  version: string;
  players: Player[];
  opponents: RoleProfile[];
  opggRegion: OpggRegion;
  onSetOpggRegion: (region: OpggRegion) => void;
  onUpdateAllyProfile: (index: number, patch: Partial<RoleProfile>) => void;
  onUpdateOpponent: (index: number, patch: Partial<RoleProfile>) => void;
  onImportPlayerTiers: (
    index: number,
    tiers: Record<string, import("@/lib/types").TierLabel>,
    tierPoolOrder: string[],
  ) => void;
};

export function PlayerProfilesSection(props: Props) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 min-[900px]:grid-cols-[600px_600px]">
      <PlayersPanel
        version={props.version}
        players={props.players}
        opggRegion={props.opggRegion}
        onSetOpggRegion={props.onSetOpggRegion}
        onUpdateAllyProfile={props.onUpdateAllyProfile}
        onImportPlayerTiers={props.onImportPlayerTiers}
        embedded
      />
      <OpponentsPanel
        opponents={props.opponents}
        opggRegion={props.opggRegion}
        onSetOpggRegion={props.onSetOpggRegion}
        onUpdateOpponent={props.onUpdateOpponent}
        embedded
      />
    </div>
  );
}

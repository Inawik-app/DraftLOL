"use client";

import type { OpggRegion, RoleProfile } from "@/lib/opggLink";
import type { Player } from "@/lib/types";
import { OpponentsPanel } from "@/components/OpponentsPanel";
import { PlayersPanel } from "@/components/PlayersPanel";

type Props = {
  playersOpen: boolean;
  opponentsOpen: boolean;
  onTogglePlayers: () => void;
  onToggleOpponents: () => void;
  version: string;
  players: Player[];
  opponents: RoleProfile[];
  myRoleIndex: number | null;
  opggRegion: OpggRegion;
  onSetOpggRegion: (region: OpggRegion) => void;
  onSetMyRoleIndex: (index: number) => void;
  onUpdateAllyProfile: (index: number, patch: Partial<RoleProfile>) => void;
  onUpdateOpponent: (index: number, patch: Partial<RoleProfile>) => void;
  onImportPlayerTiers: (
    index: number,
    tiers: Record<string, import("@/lib/types").TierLabel>,
  ) => void;
};

export function PlayerProfilesSection(props: Props) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 min-[900px]:grid-cols-[600px_600px]">
      <PlayersPanel
        open={props.playersOpen}
        onToggle={props.onTogglePlayers}
        version={props.version}
        players={props.players}
        myRoleIndex={props.myRoleIndex}
        opggRegion={props.opggRegion}
        onSetOpggRegion={props.onSetOpggRegion}
        onSetMyRoleIndex={props.onSetMyRoleIndex}
        onUpdateAllyProfile={props.onUpdateAllyProfile}
        onImportPlayerTiers={props.onImportPlayerTiers}
        embedded
      />
      <OpponentsPanel
        open={props.opponentsOpen}
        onToggle={props.onToggleOpponents}
        opponents={props.opponents}
        opggRegion={props.opggRegion}
        onSetOpggRegion={props.onSetOpggRegion}
        onUpdateOpponent={props.onUpdateOpponent}
        embedded
      />
    </div>
  );
}

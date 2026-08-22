"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChampionGrid } from "@/components/ChampionGrid";
import { DraftAnalysisBar } from "@/components/DraftAnalysisBar";
import type { HoverFocus } from "@/components/ChampionDetail";
import { LockedChampionsPanel } from "@/components/LockedChampionsPanel";
import { championIconUrl } from "@/lib/ddragon";
import {
  DRAFT_BOARD_WIDTH_PX,
  DRAFT_CENTER_COLUMN_WIDTH_PX,
  DRAFT_COLUMN_GAP_PX,
  DRAFT_TEAM_COLUMN_WIDTH_PX,
  nextEmptySlot,
  slotKey,
  type SlotTarget,
} from "@/lib/draftLayout";
import { suggestForRole } from "@/lib/suggest";
import { TAG_LABEL } from "@/lib/tagLabels";
import type {
  Champion,
  Evaluation,
  Pick,
  Player,
  Profile,
} from "@/lib/types";
import type { TeamId } from "@/state/useDraft";

const ROLES = [
  { id: "top", label: "TOP" },
  { id: "jgl", label: "JGL" },
  { id: "mid", label: "MID" },
  { id: "adc", label: "ADC" },
  { id: "sup", label: "SUP" },
] as const;

type Props = {
  version: string;
  champions: Champion[];
  picks: { blue: (Champion | null)[]; red: (Champion | null)[] };
  bans: { blue: string[]; red: string[] };
  used: Set<string>;
  locked: Map<string, number>;
  lockedByGame: Map<number, string[]>;
  players: Player[];
  profile: Profile;
  blueEval: Evaluation;
  redEval: Evaluation;
  onSetPick: (team: TeamId, index: number, champ: Champion | null) => void;
  onSetBan: (team: TeamId, index: number, id: string) => void;
};

function toSlots(
  team: (Champion | null)[],
  players: Player[],
): (Pick | null)[] {
  return team.map((champ, roleIdx) => {
    if (!champ) return null;
    const tier = players[roleIdx]?.tiers[champ.id] ?? null;
    return { champ, tier, roleIdx };
  });
}

export function DraftBoard({
  version,
  champions,
  picks,
  bans,
  used,
  locked,
  lockedByGame,
  players,
  profile,
  blueEval,
  redEval,
  onSetPick,
  onSetBan,
}: Props) {
  const [activeSlot, setActiveSlot] = useState<SlotTarget | null>(null);
  const [gridHint, setGridHint] = useState(false);
  const [slotHover, setSlotHover] = useState<HoverFocus | null>(null);
  const [gridHoverChamp, setGridHoverChamp] = useState<Champion | null>(null);

  const available = useMemo(
    () => champions.filter((c) => !used.has(c.id) && !locked.has(c.id)),
    [champions, used, locked],
  );

  const champNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of champions) map.set(c.id, c.name);
    return map;
  }, [champions]);

  const blueSlots = useMemo(
    () => toSlots(picks.blue, players),
    [picks.blue, players],
  );

  const suggestions = useMemo(() => {
    const out: Record<number, ReturnType<typeof suggestForRole>> = {};
    for (let i = 0; i < 5; i++) {
      if (picks.blue[i]) continue;
      out[i] = suggestForRole(i, blueSlots, profile, players, available);
    }
    return out;
  }, [picks.blue, blueSlots, profile, players, available]);

  const gridTierPool = useMemo(() => {
    if (
      !activeSlot ||
      activeSlot.kind !== "pick" ||
      activeSlot.team !== "blue"
    ) {
      return { prioritize: false, order: [] as string[] };
    }
    const order = players[activeSlot.index]?.tierPoolOrder ?? [];
    if (order.length === 0) {
      return { prioritize: false, order: [] as string[] };
    }
    return { prioritize: true, order };
  }, [activeSlot, players]);

  const slotTier = useMemo(() => {
    if (
      !activeSlot ||
      activeSlot.kind !== "pick" ||
      activeSlot.team !== "blue"
    ) {
      return undefined;
    }
    const playerTiers = players[activeSlot.index]?.tiers;
    if (!playerTiers || Object.keys(playerTiers).length === 0) {
      return undefined;
    }
    return (champId: string) => playerTiers[champId] ?? null;
  }, [activeSlot, players]);

  const analysisHover = useMemo((): HoverFocus | null => {
    if (slotHover) return slotHover;
    if (!gridHoverChamp) return null;
    const team = activeSlot?.team ?? "blue";
    const index =
      activeSlot?.kind === "pick"
        ? activeSlot.index
        : picks.blue.findIndex((p) => !p);
    return {
      team,
      index: index >= 0 ? index : 0,
      champ: gridHoverChamp,
    };
  }, [slotHover, gridHoverChamp, activeSlot, picks.blue]);

  const activateSlot = useCallback((slot: SlotTarget) => {
    setActiveSlot(slot);
    setGridHint(false);
  }, []);

  const clearSlot = useCallback(
    (slot: SlotTarget) => {
      if (slot.kind === "pick") {
        onSetPick(slot.team, slot.index, null);
      } else {
        onSetBan(slot.team, slot.index, "");
      }
      if (
        activeSlot &&
        slotKey(activeSlot) === slotKey(slot)
      ) {
        setActiveSlot(slot);
      }
    },
    [activeSlot, onSetPick, onSetBan],
  );

  const placeChampion = useCallback(
    (champ: Champion) => {
      if (!activeSlot) {
        setGridHint(true);
        return;
      }
      if (used.has(champ.id) || locked.has(champ.id)) return;

      if (activeSlot.kind === "pick") {
        onSetPick(activeSlot.team, activeSlot.index, champ);
      } else {
        onSetBan(activeSlot.team, activeSlot.index, champ.id);
      }

      const next = nextEmptySlot(activeSlot.team, picks, bans, activeSlot);
      setActiveSlot(next);
      setGridHint(false);
    },
    [activeSlot, used, locked, onSetPick, onSetBan, picks, bans],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveSlot(null);
        setGridHint(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div
        className="grid items-start"
        style={{
          width: `${DRAFT_BOARD_WIDTH_PX}px`,
          gridTemplateColumns: `${DRAFT_TEAM_COLUMN_WIDTH_PX}px ${DRAFT_CENTER_COLUMN_WIDTH_PX}px ${DRAFT_TEAM_COLUMN_WIDTH_PX}px`,
          gap: `${DRAFT_COLUMN_GAP_PX}px`,
        }}
        data-testid="draft-board-columns"
      >
        <TeamColumn
          team="blue"
          label="Bleu — nous"
          version={version}
          champions={champions}
          picks={picks.blue}
          bans={bans.blue}
          suggestions={suggestions}
          activeSlot={activeSlot}
          onActivate={activateSlot}
          onClear={clearSlot}
          onHover={setSlotHover}
          onSuggest={(index, champ) => onSetPick("blue", index, champ)}
        />

        <ChampionGrid
          version={version}
          champions={champions}
          used={used}
          locked={locked}
          showHint={gridHint}
          prioritizeTierPool={gridTierPool.prioritize}
          tierPoolOrder={gridTierPool.order}
          slotTier={slotTier}
          onSelect={placeChampion}
          onHover={setGridHoverChamp}
        />

        <TeamColumn
          team="red"
          label="Rouge — adverse"
          version={version}
          champions={champions}
          picks={picks.red}
          bans={bans.red}
          suggestions={{}}
          activeSlot={activeSlot}
          onActivate={activateSlot}
          onClear={clearSlot}
          onHover={setSlotHover}
          onSuggest={() => {}}
        />
      </div>

      <DraftAnalysisBar
        version={version}
        blueEval={blueEval}
        redEval={redEval}
        profileTargets={profile.targets}
        profile={profile}
        hover={analysisHover}
        picks={picks}
        players={players}
      />

      <LockedChampionsPanel
        version={version}
        lockedByGame={lockedByGame}
        champNameById={champNameById}
      />
    </>
  );
}

function TeamColumn({
  team,
  label,
  version,
  champions,
  picks,
  bans,
  suggestions,
  activeSlot,
  onActivate,
  onClear,
  onHover,
  onSuggest,
}: {
  team: TeamId;
  label: string;
  version: string;
  champions: Champion[];
  picks: (Champion | null)[];
  bans: string[];
  suggestions: Record<number, ReturnType<typeof suggestForRole>>;
  activeSlot: SlotTarget | null;
  onActivate: (slot: SlotTarget) => void;
  onClear: (slot: SlotTarget) => void;
  onHover: (focus: HoverFocus | null) => void;
  onSuggest: (index: number, champ: Champion) => void;
}) {
  const accent = team === "blue" ? "border-t-team-blue" : "border-t-team-red";
  const showSuggestions = team === "blue";
  const champNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of champions) map.set(c.id, c.name);
    return map;
  }, [champions]);

  const isActive = (slot: SlotTarget) =>
    activeSlot !== null && slotKey(activeSlot) === slotKey(slot);

  const slotFrameClass = (slot: SlotTarget) => {
    const active = isActive(slot);
    return `relative shrink-0 overflow-hidden border bg-panel2 p-0 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
      active
        ? "border-gold ring-2 ring-gold/40"
        : "border-line hover:border-gold"
    }`;
  };

  return (
    <section
      aria-label={`Draft ${label}`}
      className={`border border-line bg-panel p-2.5 border-t-2 ${accent}`}
      style={{ width: `${DRAFT_TEAM_COLUMN_WIDTH_PX}px` }}
    >
      <div className="mb-2">
        <h2 className="font-cond text-base">{label}</h2>
      </div>

      <div className="mb-2.5 flex gap-1">
        {bans.map((id, i) => {
          const slot: SlotTarget = { team, kind: "ban", index: i };
          const banName = id ? champNameById.get(id) ?? id : null;
          const aria = banName
            ? `Ban ${banName}`
            : "Ban vide — sélectionner puis choisir dans la grille";
          return (
            <div key={`${team}-ban-${i}`} className="group relative">
              <button
                type="button"
                aria-label={aria}
                aria-pressed={isActive(slot)}
                title={aria}
                className={`${slotFrameClass(slot)} h-11 w-11 min-[900px]:h-[34px] min-[900px]:w-[34px] ${
                  id
                    ? "after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(45deg,transparent_45%,var(--bad)_45%,var(--bad)_55%,transparent_55%)] after:opacity-85"
                    : ""
                }`}
                onClick={() => onActivate(slot)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (id) onClear(slot);
                }}
              >
                {id ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={championIconUrl(version, id)}
                    alt=""
                    className="h-full w-full brightness-50 grayscale"
                  />
                ) : null}
              </button>
              {id ? (
                <button
                  type="button"
                  aria-label={`Retirer le ban ${banName}`}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center border border-line bg-ink text-[10px] text-bad group-hover:flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear(slot);
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {ROLES.map((role, i) => {
        const champ = picks[i];
        const slot: SlotTarget = { team, kind: "pick", index: i };
        const aria = champ
          ? `${champ.name}, ${role.label}`
          : `Emplacement vide (${role.label}) — sélectionner puis choisir dans la grille`;
        const suggs = showSuggestions ? suggestions[i] : undefined;
        return (
          <div
            key={role.id}
            className="flex items-center gap-2 border-b border-[#141C27] py-1.5 last:border-b-0"
          >
            <span className="font-cond w-[30px] shrink-0 text-center text-[11px] tracking-[0.08em] text-dim">
              {role.label}
            </span>
            <div className="group relative">
              <button
                type="button"
                aria-label={aria}
                aria-pressed={isActive(slot)}
                title={aria}
                className={`${slotFrameClass(slot)} champ-frame h-[52px] w-[52px]`}
                onClick={() => onActivate(slot)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (champ) onClear(slot);
                }}
                onMouseEnter={() => {
                  if (champ) onHover({ team, index: i, champ });
                }}
                onFocus={() => {
                  if (champ) onHover({ team, index: i, champ });
                }}
                onMouseLeave={() => onHover(null)}
                onBlur={() => onHover(null)}
              >
                {champ ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={championIconUrl(version, champ.id)}
                    alt=""
                    className="block h-full w-full"
                  />
                ) : (
                  <span className="block text-center text-[22px] leading-[52px] text-dim">
                    +
                  </span>
                )}
              </button>
              {champ ? (
                <button
                  type="button"
                  aria-label={`Retirer ${champ.name}`}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center border border-line bg-ink text-[10px] text-bad group-hover:flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear(slot);
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              {champ ? (
                <div className="font-cond truncate text-[15px]">{champ.name}</div>
              ) : suggs?.champions.length ? (
                <div className="min-w-0 flex-1">
                  {suggs.roleFilterWidened ? (
                    <p className="mb-0.5 text-[9px] text-warn">
                      Pool élargi — aucun champion pour ce rôle
                    </p>
                  ) : null}
                  <div className="flex items-center gap-0.5">
                    {suggs.champions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        title={`${c.name} — ${c.tags.map((t) => TAG_LABEL[t]).join(", ")}`}
                        aria-label={`Suggérer ${c.name} en ${role.label}`}
                        className="h-11 w-11 overflow-hidden border border-line bg-panel2 p-0 opacity-75 transition hover:border-gold hover:opacity-100 focus-visible:border-gold focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold min-[900px]:h-[26px] min-[900px]:w-[26px]"
                        onClick={() => onSuggest(i, c)}
                        onMouseEnter={() =>
                          onHover({ team, index: i, champ: c })
                        }
                        onFocus={() => onHover({ team, index: i, champ: c })}
                        onMouseLeave={() => onHover(null)}
                        onBlur={() => onHover(null)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={championIconUrl(version, c.id)}
                          alt={c.name}
                          className="block h-full w-full"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="text-[10px] text-dim">Vide</span>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

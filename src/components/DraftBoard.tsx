"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import {
  ChampionDetail,
  type HoverFocus,
} from "@/components/ChampionDetail";
import { ChampionPicker, type PickerTarget } from "@/components/ChampionPicker";
import { championIconUrl } from "@/lib/ddragon";
import { suggestForRole } from "@/lib/suggest";
import { scoreColor, TAG_LABEL } from "@/lib/tagLabels";
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

const TEAM_LABEL: Record<TeamId, string> = {
  blue: "bleu",
  red: "rouge",
};

type Props = {
  version: string;
  champions: Champion[];
  picks: { blue: (Champion | null)[]; red: (Champion | null)[] };
  bans: { blue: string[]; red: string[] };
  used: Set<string>;
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
  players,
  profile,
  blueEval,
  redEval,
  onSetPick,
  onSetBan,
}: Props) {
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [hover, setHover] = useState<HoverFocus | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const available = useMemo(
    () => champions.filter((c) => !used.has(c.id)),
    [champions, used],
  );

  const blueSlots = useMemo(
    () => toSlots(picks.blue, players),
    [picks.blue, players],
  );

  const suggestions = useMemo(() => {
    const out: Record<number, Champion[]> = {};
    for (let i = 0; i < 5; i++) {
      if (picks.blue[i]) continue;
      out[i] = suggestForRole(i, blueSlots, profile, players, available);
    }
    return out;
  }, [picks.blue, blueSlots, profile, players, available]);

  const openPicker = (target: PickerTarget, el: HTMLButtonElement) => {
    triggerRef.current = el;
    setPicker(target);
  };

  const closePicker = () => setPicker(null);

  const commit = (champ: Champion | null) => {
    if (!picker) return;
    if (picker.kind === "pick") {
      onSetPick(picker.team, picker.index, champ);
    } else {
      onSetBan(picker.team, picker.index, champ ? champ.id : "");
    }
    closePicker();
  };

  const pickerTitle =
    picker == null
      ? ""
      : picker.kind === "ban"
        ? `Ban ${TEAM_LABEL[picker.team]} ${picker.index + 1}`
        : `${ROLES[picker.index].label} · ${TEAM_LABEL[picker.team]}`;

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-3.5 min-[900px]:grid-cols-[1fr_320px_1fr]">
        <TeamColumn
          team="blue"
          label="Bleu — nous"
          version={version}
          picks={picks.blue}
          bans={bans.blue}
          score={blueEval.score}
          suggestions={suggestions}
          onOpen={openPicker}
          onHover={setHover}
          onSuggest={(index, champ) => onSetPick("blue", index, champ)}
        />

        <aside className="sticky top-2.5 border border-line bg-panel p-3">
          <AnalysisPanel
            evaluation={blueEval}
            profileTargets={profile.targets}
          />
          <ChampionDetail
            version={version}
            hover={hover}
            picks={picks}
            players={players}
            profile={profile}
            allyEval={blueEval}
          />
        </aside>

        <TeamColumn
          team="red"
          label="Rouge — adverse"
          version={version}
          picks={picks.red}
          bans={bans.red}
          score={redEval.score}
          suggestions={{}}
          onOpen={openPicker}
          onHover={setHover}
          onSuggest={() => {}}
        />
      </div>

      <ChampionPicker
        open={picker !== null}
        title={pickerTitle}
        champions={champions}
        version={version}
        used={used}
        triggerRef={triggerRef as RefObject<HTMLElement | null>}
        matchupContext={
          picker?.kind === "pick" && picker.team === "blue"
            ? {
                player: players[picker.index],
                enemy: picks.red[picker.index],
              }
            : null
        }
        slotTier={
          picker?.kind === "pick" && picker.team === "blue"
            ? (id) => players[picker.index]?.tiers[id] ?? null
            : undefined
        }
        onPick={commit}
        onClose={closePicker}
      />
    </>
  );
}

function TeamColumn({
  team,
  label,
  version,
  picks,
  bans,
  score,
  suggestions,
  onOpen,
  onHover,
  onSuggest,
}: {
  team: TeamId;
  label: string;
  version: string;
  picks: (Champion | null)[];
  bans: string[];
  score: number;
  suggestions: Record<number, Champion[]>;
  onOpen: (target: PickerTarget, el: HTMLButtonElement) => void;
  onHover: (focus: HoverFocus | null) => void;
  onSuggest: (index: number, champ: Champion) => void;
}) {
  const accent = team === "blue" ? "border-t-team-blue" : "border-t-team-red";
  const showSuggestions = team === "blue";

  return (
    <section className={`border border-line bg-panel p-2.5 border-t-2 ${accent}`}>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-cond text-base">{label}</h2>
        <span
          className="font-cond text-[22px] leading-none"
          style={{ color: scoreColor(score) }}
        >
          {Math.round(score)}
        </span>
      </div>

      <div className="mb-2.5 flex gap-1">
        {bans.map((id, i) => {
          const aria = id
            ? `Ban ${TEAM_LABEL[team]} ${i + 1} : ${id}`
            : `Choisir le ban ${TEAM_LABEL[team]} ${i + 1}`;
          return (
            <button
              key={`${team}-ban-${i}`}
              type="button"
              aria-label={aria}
              title={aria}
              className={`relative h-[34px] w-[34px] shrink-0 overflow-hidden border border-line bg-panel2 p-0 transition hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                id
                  ? "after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(45deg,transparent_45%,var(--bad)_45%,var(--bad)_55%,transparent_55%)] after:opacity-85"
                  : ""
              }`}
              onClick={(e) =>
                onOpen({ team, kind: "ban", index: i }, e.currentTarget)
              }
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
          );
        })}
      </div>

      {ROLES.map((role, i) => {
        const champ = picks[i];
        const aria = champ
          ? `Pick ${role.label} ${TEAM_LABEL[team]} : ${champ.name}`
          : `Choisir le pick ${role.label} ${TEAM_LABEL[team]}`;
        const suggs = showSuggestions ? suggestions[i] : undefined;
        return (
          <div
            key={role.id}
            className="flex items-center gap-2 border-b border-[#141C27] py-1.5 last:border-b-0"
          >
            <span className="font-cond w-[30px] shrink-0 text-center text-[11px] tracking-[0.08em] text-dim">
              {role.label}
            </span>
            <button
              type="button"
              aria-label={aria}
              className="champ-frame h-[52px] w-[52px] shrink-0 overflow-hidden border border-line bg-panel2 p-0 transition hover:border-gold focus-visible:border-gold focus-visible:outline-none"
              onClick={(e) =>
                onOpen({ team, kind: "pick", index: i }, e.currentTarget)
              }
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
                <span className="block text-center text-[22px] leading-[52px] text-[#33445C]">
                  +
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              {champ ? (
                <div className="font-cond truncate text-[15px]">{champ.name}</div>
              ) : suggs?.length ? (
                <div className="flex items-center gap-0.5">
                  {suggs.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={`${c.name} — ${c.tags.map((t) => TAG_LABEL[t]).join(", ")}`}
                      aria-label={`Suggérer ${c.name} en ${role.label}`}
                      className="h-[26px] w-[26px] overflow-hidden border border-line bg-panel2 p-0 opacity-75 transition hover:border-gold hover:opacity-100 focus-visible:border-gold focus-visible:opacity-100 focus-visible:outline-none"
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

"use client";

import { useMemo, useState } from "react";
import { ROLES_BY_INDEX, ROLE_SHORT, championPlaysRole, type DraftRole } from "@/data/roles";
import { championIconUrl } from "@/lib/ddragon";
import {
  CHAMPION_GRID_CELL_PX,
  CHAMPION_GRID_COLS,
  CHAMPION_GRID_FILTERS_HEIGHT_PX,
  CHAMPION_GRID_GAP_PX,
  CHAMPION_GRID_PADDING_PX,
  CHAMPION_GRID_SCROLL_HEIGHT_PX,
  CHAMPION_GRID_SEARCH_HEIGHT_PX,
  DRAFT_CENTER_COLUMN_WIDTH_PX,
  ROLE_FILTER_BUTTON_WIDTH_PX,
  ROLE_FILTER_GAP_PX,
} from "@/lib/draftLayout";
import { subsequenceScore } from "@/lib/search";
import type { Champion } from "@/lib/types";

type Props = {
  version: string;
  champions: Champion[];
  used: Set<string>;
  locked: Map<string, number>;
  showHint: boolean;
  onSelect: (champ: Champion) => void;
  onHover: (champ: Champion | null) => void;
};

type RoleFilter = DraftRole | "all";

export function ChampionGrid({
  version,
  champions,
  used,
  locked,
  showHint,
  onSelect,
  onHover,
}: Props) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const rosterOrder = useMemo(
    () => [...champions].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [champions],
  );

  const rowCount = Math.ceil(rosterOrder.length / CHAMPION_GRID_COLS);

  return (
    <section
      aria-label="Grille de champions"
      className="border border-line bg-panel"
      style={{ width: `${DRAFT_CENTER_COLUMN_WIDTH_PX}px` }}
      data-testid="champion-grid-panel"
    >
      <div
        className="border-b border-line px-2.5"
        style={{ height: `${CHAMPION_GRID_SEARCH_HEIGHT_PX}px` }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Recherche — kss, mrgn, twf…"
          className="font-cond h-full w-full border-0 bg-transparent text-[13px] tracking-[0.06em] text-txt placeholder:text-dim focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
          aria-label="Rechercher un champion"
        />
      </div>

      <div
        className="flex items-center border-b border-line px-2.5"
        style={{
          height: `${CHAMPION_GRID_FILTERS_HEIGHT_PX}px`,
          gap: `${ROLE_FILTER_GAP_PX}px`,
        }}
      >
        <RoleFilterBtn
          label="TOUS"
          active={roleFilter === "all"}
          onClick={() => setRoleFilter("all")}
        />
        {ROLES_BY_INDEX.map((role) => (
          <RoleFilterBtn
            key={role}
            label={ROLE_SHORT[role]}
            active={roleFilter === role}
            onClick={() => setRoleFilter(role)}
          />
        ))}
      </div>

      {showHint ? (
        <p
          className="border-b border-line px-2.5 py-1 text-[10px] text-warn"
          role="status"
          style={{ height: "22px", lineHeight: "20px" }}
        >
          Sélectionnez un emplacement (pick ou ban) avant de choisir un champion.
        </p>
      ) : (
        <div className="border-b border-line" style={{ height: "22px" }} aria-hidden />
      )}

      <div
        className="overflow-y-auto overflow-x-hidden px-2.5 py-2"
        style={{
          height: `${CHAMPION_GRID_SCROLL_HEIGHT_PX}px`,
          paddingLeft: `${CHAMPION_GRID_PADDING_PX}px`,
          paddingRight: `${CHAMPION_GRID_PADDING_PX}px`,
        }}
        data-testid="champion-grid-scroll"
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${CHAMPION_GRID_COLS}, ${CHAMPION_GRID_CELL_PX}px)`,
            gap: `${CHAMPION_GRID_GAP_PX}px`,
            minHeight: `${rowCount * (CHAMPION_GRID_CELL_PX + CHAMPION_GRID_GAP_PX) - CHAMPION_GRID_GAP_PX}px`,
          }}
          data-testid="champion-grid"
        >
          {rosterOrder.map((c) => {
            const matchesSearch =
              !query.trim() || subsequenceScore(query, c.name) !== null;
            const matchesRole =
              roleFilter === "all" || championPlaysRole(c.id, roleFilter);
            const visible = matchesSearch && matchesRole;
            const lockGame = locked.get(c.id);
            const disabled = used.has(c.id) || lockGame !== undefined;

            return (
              <button
                key={c.id}
                type="button"
                title={
                  lockGame !== undefined
                    ? `${c.name} — verrouillé (Game ${lockGame})`
                    : disabled
                      ? `${c.name} — indisponible`
                      : c.name
                }
                aria-label={c.name}
                disabled={disabled}
                className={`overflow-hidden border bg-panel2 p-0 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold ${
                  visible ? "" : "invisible pointer-events-none"
                } ${
                  disabled
                    ? "cursor-not-allowed border-line brightness-50 grayscale opacity-50"
                    : "cursor-pointer border-line hover:border-gold"
                }`}
                style={{
                  width: `${CHAMPION_GRID_CELL_PX}px`,
                  height: `${CHAMPION_GRID_CELL_PX}px`,
                }}
                onClick={() => !disabled && onSelect(c)}
                onMouseEnter={() => onHover(c)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(c)}
                onBlur={() => onHover(null)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={championIconUrl(version, c.id)}
                  alt=""
                  className="block h-full w-full"
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RoleFilterBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-cond shrink-0 border text-[10px] tracking-[0.08em] transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold ${
        active
          ? "border-gold bg-ink text-gold"
          : "border-line bg-panel2 text-dim hover:border-gold hover:text-gold"
      }`}
      style={{
        width: `${ROLE_FILTER_BUTTON_WIDTH_PX}px`,
        height: "22px",
      }}
    >
      {label}
    </button>
  );
}

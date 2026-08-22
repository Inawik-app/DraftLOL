"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { championIconUrl } from "@/lib/ddragon";
import {
  type DraftRole,
  championPlaysRole,
} from "@/data/roles";
import { subsequenceScore } from "@/lib/search";
import {
  assignmentsToLists,
  listsToAssignments,
  type TierAssignments,
} from "@/lib/tierList";
import {
  clearTierListStorage,
  loadTierListFromStorage,
  saveTierListToStorage,
  TIER_LIST_STORAGE_UNAVAILABLE_MSG,
} from "@/lib/tierListStorage";
import { decodeTierSeed, encodeTierSeed } from "@/lib/tierSeed";
import {
  ROLE_FILTER_BAR_WIDTH_PX,
  ROLE_FILTER_BUTTON_WIDTH_PX,
  ROLE_FILTER_GAP_PX,
  SEARCH_COLUMN_WIDTH_PX,
  SEARCH_GRID_GAP_PX,
  SEARCH_RESULT_COLS,
  SEARCH_RESULTS_HEIGHT_PX,
  SEARCH_CHIP_HEIGHT_PX,
  TIER_COLUMN_HEIGHT_PX,
  TIER_COLUMN_WIDTH_PX,
  TIER_GRID_GAP_PX,
  TIERS_PAGE_WIDTH_PX,
} from "@/lib/tiersLayout";
import { extractToken } from "@/lib/token";
import { isLocalStorageAvailable } from "@/lib/storage";
import type { Champion, TierLabel } from "@/lib/types";
import { RoleTags } from "@/components/RoleTags";

const TIERS: TierLabel[] = ["S", "A", "B"];

const ROLE_FILTERS: { id: DraftRole | null; label: string }[] = [
  { id: null, label: "ALL" },
  { id: "top", label: "TOP" },
  { id: "jgl", label: "JGL" },
  { id: "mid", label: "MID" },
  { id: "adc", label: "ADC" },
  { id: "sup", label: "SUP" },
];

type Props = {
  version: string;
  champions: Champion[];
};

function matchesRoleFilter(championId: string, roleFilter: DraftRole | null): boolean {
  if (!roleFilter) return true;
  return championPlaysRole(championId, roleFilter);
}

export function TierListEditor({ version, champions }: Props) {
  const [assignments, setAssignments] = useState<TierAssignments>({});
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<DraftRole | null>(null);
  const [importIn, setImportIn] = useState("");
  const [importError, setImportError] = useState("");
  const [storageNotice, setStorageNotice] = useState(false);
  const [copyFlash, setCopyFlash] = useState("");
  const [dragKey, setDragKey] = useState<number | null>(null);
  const [dropTier, setDropTier] = useState<TierLabel | null>(null);
  const seedFieldRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);

  const championsByKey = useMemo(
    () => new Map(champions.map((c) => [c.key, c])),
    [champions],
  );

  const lists = useMemo(() => assignmentsToLists(assignments), [assignments]);
  const seed = useMemo(() => encodeTierSeed(lists), [lists]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const stored = loadTierListFromStorage();
    if (stored) setAssignments(listsToAssignments(stored));
    setStorageNotice(!isLocalStorageAvailable());
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const ok = saveTierListToStorage(lists);
    if (!ok && isLocalStorageAvailable()) setStorageNotice(true);
  }, [lists]);

  const assignedKeys = useMemo(
    () => new Set(Object.keys(assignments).map(Number)),
    [assignments],
  );

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return champions
      .filter((c) => !assignedKeys.has(c.key))
      .filter((c) => matchesRoleFilter(c.id, roleFilter))
      .map((c) => ({ c, s: subsequenceScore(query, c.name) }))
      .filter((x) => x.s !== null)
      .sort((a, b) => (b.s as number) - (a.s as number))
      .map((x) => x.c);
  }, [query, champions, assignedKeys, roleFilter]);

  const columns = useMemo(() => {
    const out: Record<TierLabel, Champion[]> = { S: [], A: [], B: [] };
    for (const tier of TIERS) {
      out[tier] = lists[tier]
        .map((key) => championsByKey.get(key))
        .filter((c): c is Champion => c != null)
        .filter((c) => matchesRoleFilter(c.id, roleFilter));
    }
    return out;
  }, [lists, championsByKey, roleFilter]);

  const addChampion = useCallback((champion: Champion, tier: TierLabel = "S") => {
    setAssignments((prev) => ({ ...prev, [champion.key]: tier }));
    setQuery("");
  }, []);

  const moveToTier = useCallback((key: number, tier: TierLabel) => {
    setAssignments((prev) => {
      if (prev[key] === tier) return prev;
      return { ...prev, [key]: tier };
    });
  }, []);

  const clearDragState = useCallback(() => {
    setDragKey(null);
    setDropTier(null);
  }, []);

  const removeKey = useCallback((key: number) => {
    setAssignments((prev) => {
      const out = { ...prev };
      delete out[key];
      return out;
    });
  }, []);

  const importSeed = () => {
    setImportError("");
    const extracted = extractToken(importIn);
    if (!extracted) {
      setImportError(
        "Aucune seed TL1 reconnue. Colle un token nu ou un lien contenant TL1.",
      );
      return;
    }
    const decoded = decodeTierSeed(extracted);
    if (!decoded.ok) {
      setImportError(decoded.reason);
      return;
    }
    setAssignments(listsToAssignments(decoded.lists));
    setImportIn("");
  };

  const resetAll = () => {
    if (
      !window.confirm(
        "Effacer toute la tier list ? Cette action est irréversible.",
      )
    ) {
      return;
    }
    setAssignments({});
    clearTierListStorage();
  };

  const copySeed = async () => {
    setCopyFlash("");
    try {
      await navigator.clipboard.writeText(seed);
      setCopyFlash("Seed copiée.");
    } catch {
      seedFieldRef.current?.focus();
      seedFieldRef.current?.select();
      setCopyFlash(
        "Copie refusée — la seed est sélectionnée, utilise Ctrl+C (Cmd+C sur Mac).",
      );
    }
    window.setTimeout(() => setCopyFlash(""), 2600);
  };

  return (
    <div
      className="shrink-0 space-y-4"
      style={{ width: `${TIERS_PAGE_WIDTH_PX - 28}px` }}
      data-tiers-root="inner"
    >
      {storageNotice ? (
        <p className="border border-line bg-panel2 px-3 py-2 text-[12px] text-dim">
          {TIER_LIST_STORAGE_UNAVAILABLE_MSG}
        </p>
      ) : null}

      <section className="border border-line bg-panel p-3">
        <h2 className="font-cond text-base">Recherche</h2>
        <p className="font-cond mt-1 text-[11px] tracking-[0.1em] text-dim">
          Tape les lettres dans l&apos;ordre — kss, mrgn, twf… Clique pour
          ajouter en tier S.
        </p>

        <div
          className="mt-2 shrink-0"
          style={{ width: `${ROLE_FILTER_BAR_WIDTH_PX}px` }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(6, ${ROLE_FILTER_BUTTON_WIDTH_PX}px)`,
              gap: `${ROLE_FILTER_GAP_PX}px`,
            }}
          >
            {ROLE_FILTERS.map(({ id, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => setRoleFilter(id)}
                style={{
                  width: `${ROLE_FILTER_BUTTON_WIDTH_PX}px`,
                  height: "32px",
                }}
                className={`font-cond border text-[10px] tracking-[0.08em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                  roleFilter === id
                    ? "border-gold bg-ink text-gold"
                    : "border-line bg-panel2 text-txt hover:border-gold hover:text-gold"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom de champion…"
          className="mt-2 w-full border border-line bg-ink px-2 py-1.5 text-sm text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
          aria-label="Rechercher un champion"
        />
        <div
          id="search-results"
          className="mt-2 overflow-y-auto"
          style={{ height: `${SEARCH_RESULTS_HEIGHT_PX}px` }}
          aria-live="polite"
        >
          {query.trim() ? (
            searchResults.length > 0 ? (
              <ul
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${SEARCH_RESULT_COLS}, ${SEARCH_COLUMN_WIDTH_PX}px)`,
                  gap: `${SEARCH_GRID_GAP_PX}px`,
                }}
              >
                {searchResults.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => addChampion(c, "S")}
                      style={{ height: `${SEARCH_CHIP_HEIGHT_PX}px` }}
                      className="flex w-full items-center gap-1.5 overflow-hidden border border-line bg-panel2 px-1.5 py-1 text-left text-txt hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={championIconUrl(version, c.id)}
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6 shrink-0"
                      />
                      <span className="min-w-0 flex-1 truncate font-cond text-[12px]">
                        {c.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-dim">Aucun champion trouvé.</p>
            )
          ) : (
            <span className="sr-only">Zone résultats vide</span>
          )}
        </div>
      </section>

      <p className="font-cond text-[11px] tracking-[0.1em] text-dim">
        Glisse-dépose un champion entre les colonnes pour changer de tier. Clic
        droit ou × pour retirer du pool.
      </p>

      <div
        className="grid shrink-0"
        style={{
          gridTemplateColumns: `repeat(3, ${TIER_COLUMN_WIDTH_PX}px)`,
          gap: `${TIER_GRID_GAP_PX}px`,
        }}
      >
        {TIERS.map((tier) => (
          <section
            key={tier}
            aria-label={`Colonne tier ${tier}`}
            className={`flex shrink-0 flex-col border bg-panel p-2.5 transition-colors ${
              dropTier === tier
                ? "border-gold bg-panel2"
                : "border-line"
            }`}
            style={{
              width: `${TIER_COLUMN_WIDTH_PX}px`,
              height: `${TIER_COLUMN_HEIGHT_PX + 48}px`,
            }}
            onDragEnter={() => setDropTier(tier)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const raw = e.dataTransfer.getData("text/plain");
              const key = Number.parseInt(raw, 10);
              if (Number.isInteger(key)) moveToTier(key, tier);
              clearDragState();
            }}
          >
            <div className="mb-2 flex shrink-0 items-baseline justify-between">
              <h3 className="font-cond text-lg text-gold">Tier {tier}</h3>
              <span className="font-cond text-[11px] tracking-[0.1em] text-dim">
                {columns[tier].length} champion
                {columns[tier].length === 1 ? "" : "s"}
              </span>
            </div>
            <ul
              className="min-h-0 shrink-0 space-y-1 overflow-y-auto"
              style={{ height: `${TIER_COLUMN_HEIGHT_PX}px` }}
            >
              {columns[tier].map((c) => (
                <li
                  key={c.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", String(c.key));
                    e.dataTransfer.effectAllowed = "move";
                    setDragKey(c.key);
                  }}
                  onDragEnd={clearDragState}
                  className={`flex cursor-grab items-center gap-1.5 border border-line bg-panel2 px-1 py-0.5 active:cursor-grabbing ${
                    dragKey === c.key ? "opacity-50" : ""
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    removeKey(c.key);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={championIconUrl(version, c.id)}
                    alt=""
                    width={28}
                    height={28}
                    draggable={false}
                    className="h-7 w-7 shrink-0 pointer-events-none"
                  />
                  <span className="min-w-0 flex-1 overflow-hidden">
                    <span className="block truncate text-[12px] leading-tight select-none">
                      {c.name}
                    </span>
                    <RoleTags championId={c.id} />
                  </span>
                  <button
                    type="button"
                    title="Retirer"
                    aria-label={`Retirer ${c.name}`}
                    onClick={() => removeKey(c.key)}
                    className="font-cond h-8 min-w-8 border border-line bg-ink text-[10px] text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    ×
                  </button>
                </li>
              ))}
              {columns[tier].length === 0 ? (
                <li
                  className={`py-6 text-center text-[11px] ${
                    dragKey != null ? "text-gold" : "text-dim"
                  }`}
                >
                  {dragKey != null ? "Déposer ici" : "Vide"}
                </li>
              ) : null}
            </ul>
          </section>
        ))}
      </div>

      <section className="border border-line bg-panel p-3">
        <h2 className="font-cond text-base">Seed TL1.</h2>
        <p className="font-cond mt-1 text-[11px] tracking-[0.1em] text-dim">
          Exporte ou importe ta tier list compacte — à coller dans le panneau
          Joueurs du board.
        </p>
        {copyFlash ? (
          <p className="font-cond mt-1 text-[11px] tracking-[0.1em] text-gold">
            {copyFlash}
          </p>
        ) : null}
        <div className="mt-2 flex gap-1.5">
          <input
            ref={seedFieldRef}
            readOnly
            value={seed}
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 border border-line bg-ink px-1.5 py-1 font-mono text-[10px] text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
            aria-label="Seed TL1 en lecture seule"
          />
          <button
            type="button"
            onClick={copySeed}
            className="font-cond shrink-0 border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Copier
          </button>
        </div>
        <div className="mt-2 flex gap-1.5">
          <input
            value={importIn}
            onChange={(e) => {
              setImportIn(e.target.value);
              setImportError("");
            }}
            placeholder="Coller une seed TL1. reçue…"
            className="min-w-0 flex-1 border border-line bg-ink px-1.5 py-1 font-mono text-[10px] text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
            aria-label="Importer une seed TL1"
          />
          <button
            type="button"
            onClick={importSeed}
            disabled={!importIn.trim()}
            className="font-cond shrink-0 border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt hover:border-gold hover:text-gold disabled:text-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Importer
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="font-cond shrink-0 border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt hover:border-bad hover:text-bad focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Tout effacer
          </button>
        </div>
        {importError ? (
          <p className="mt-1.5 text-[11px] text-bad" role="alert">
            {importError}
          </p>
        ) : null}
      </section>
    </div>
  );
}

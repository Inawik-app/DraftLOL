"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { championIconUrl } from "@/lib/ddragon";
import { subsequenceScore } from "@/lib/search";
import {
  assignmentsToLists,
  listsToAssignments,
  nextTierLabel,
  type TierAssignments,
} from "@/lib/tierList";
import {
  clearTierListStorage,
  loadTierListFromStorage,
  saveTierListToStorage,
  TIER_LIST_STORAGE_UNAVAILABLE_MSG,
} from "@/lib/tierListStorage";
import { decodeTierSeed, encodeTierSeed } from "@/lib/tierSeed";
import { extractToken } from "@/lib/token";
import { isLocalStorageAvailable } from "@/lib/storage";
import type { Champion, TierLabel } from "@/lib/types";

const TIERS: TierLabel[] = ["S", "A", "B"];
/** Two rows of champion chips — fixed slot so typing never shifts layout. */
const SEARCH_RESULTS_HEIGHT = "4.75rem";
const TIER_COLUMN_LIST_HEIGHT = "min(480px, 42vh)";

type Props = {
  version: string;
  champions: Champion[];
};

export function TierListEditor({ version, champions }: Props) {
  const [assignments, setAssignments] = useState<TierAssignments>({});
  const [query, setQuery] = useState("");
  const [importIn, setImportIn] = useState("");
  const [importError, setImportError] = useState("");
  const [storageNotice, setStorageNotice] = useState(false);
  const [copyFlash, setCopyFlash] = useState("");
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
      .map((c) => ({ c, s: subsequenceScore(query, c.name) }))
      .filter((x) => x.s !== null)
      .sort((a, b) => (b.s as number) - (a.s as number))
      .slice(0, 12)
      .map((x) => x.c);
  }, [query, champions, assignedKeys]);

  const columns = useMemo(() => {
    const out: Record<TierLabel, Champion[]> = { S: [], A: [], B: [] };
    for (const tier of TIERS) {
      out[tier] = lists[tier]
        .map((key) => championsByKey.get(key))
        .filter((c): c is Champion => c != null);
    }
    return out;
  }, [lists, championsByKey]);

  const addChampion = useCallback((champion: Champion, tier: TierLabel = "S") => {
    setAssignments((prev) => ({ ...prev, [champion.key]: tier }));
    setQuery("");
  }, []);

  const cycleTier = useCallback((key: number) => {
    setAssignments((prev) => {
      const cur = prev[key];
      if (!cur) return prev;
      const next = nextTierLabel(cur);
      const out = { ...prev };
      if (next) out[key] = next;
      else delete out[key];
      return out;
    });
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
    <div className="space-y-4">
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
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom de champion…"
          className="mt-2 w-full border border-line bg-ink px-2 py-1.5 text-sm text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
          aria-label="Rechercher un champion"
        />
        <div
          className="mt-2 overflow-y-auto"
          style={{ height: SEARCH_RESULTS_HEIGHT }}
          aria-live="polite"
          aria-hidden={!query.trim()}
        >
          {query.trim() ? (
            searchResults.length > 0 ? (
              <ul className="flex flex-wrap content-start gap-1.5">
                {searchResults.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => addChampion(c, "S")}
                      className="flex items-center gap-1.5 border border-line bg-panel2 px-1.5 py-1 text-left text-txt hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={championIconUrl(version, c.id)}
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6"
                      />
                      <span className="font-cond text-[12px]">{c.name}</span>
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

      <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-3">
        {TIERS.map((tier) => (
          <section
            key={tier}
            aria-label={`Colonne tier ${tier}`}
            className="flex min-w-0 flex-col border border-line bg-panel p-2.5"
          >
            <div className="mb-2 flex shrink-0 items-baseline justify-between">
              <h3 className="font-cond text-lg text-gold">Tier {tier}</h3>
              <span className="font-cond text-[11px] tracking-[0.1em] text-dim">
                {columns[tier].length} champion
                {columns[tier].length === 1 ? "" : "s"}
              </span>
            </div>
            <ul
              className="min-h-0 flex-1 space-y-1 overflow-y-auto"
              style={{ height: TIER_COLUMN_LIST_HEIGHT }}
            >
              {columns[tier].map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-1.5 border border-line bg-panel2 px-1 py-0.5"
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
                    className="h-7 w-7 shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px]">
                    {c.name}
                  </span>
                  <button
                    type="button"
                    title="Changer de tier"
                    aria-label={`${c.name}, tier ${tier} — cliquer pour déplacer`}
                    onClick={() => cycleTier(c.key)}
                    className="font-cond h-8 min-w-8 border border-line bg-ink px-1.5 text-[10px] text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    {tier}
                  </button>
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
                <li className="text-[11px] text-dim">Vide</li>
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

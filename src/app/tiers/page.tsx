"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { FailurePanel } from "@/components/FailurePanel";
import { TierListEditor } from "@/components/TierListEditor";
import {
  DDragonLoadError,
  loadChampions,
} from "@/lib/ddragon";
import { setChampionCatalog } from "@/lib/room";
import { TIERS_PAGE_WIDTH_PX } from "@/lib/tiersLayout";

/** /tiers never carries the draft board hash — strip legacy fragments on load. */
function stripBoardHashFromUrl(): void {
  if (typeof window === "undefined" || !window.location.hash) return;
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`,
  );
}

export default function TiersPage() {
  const [version, setVersion] = useState<string | null>(null);
  const [champions, setChampions] = useState<
    Awaited<ReturnType<typeof loadChampions>>["champions"]
  >([]);
  const [loadError, setLoadError] = useState<DDragonLoadError | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    stripBoardHashFromUrl();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadChampions();
        if (cancelled) return;
        setLoadError(null);
        setVersion(data.version);
        setChampions(data.champions);
        setChampionCatalog(data.champions);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof DDragonLoadError) {
          setLoadError(e);
          return;
        }
        setLoadError(
          new DDragonLoadError(
            "network",
            "Impossible de charger les champions depuis Data Dragon.",
          ),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  if (loadError) {
    return (
      <FailurePanel
        title={
          loadError.kind === "parse"
            ? "Données champions illisibles"
            : "Data Dragon injoignable"
        }
        message={loadError.message}
        actions={[
          {
            label: "Réessayer",
            onClick: () => {
              setLoadError(null);
              setVersion(null);
              setChampions([]);
              setLoadAttempt((n) => n + 1);
            },
          },
        ]}
      />
    );
  }

  if (!version) {
    return (
      <div
        className="mx-auto shrink-0 px-3.5 py-3.5"
        style={{ width: `${TIERS_PAGE_WIDTH_PX}px` }}
        data-tiers-root="page"
      >
        <p className="font-cond text-[11px] tracking-[0.1em] text-dim">
          Chargement du patch depuis Data Dragon…
        </p>
      </div>
    );
  }

  return (
    <div
      className="mx-auto shrink-0 px-3.5 pb-14 pt-3.5"
      style={{ width: `${TIERS_PAGE_WIDTH_PX}px` }}
      data-tiers-root="page"
    >
      <AppNav />
      <header className="mb-3 border-b border-line pb-2.5">
        <h1 className="font-cond text-[26px] leading-none tracking-[0.14em]">
          Tier<span className="text-gold">.</span>list
        </h1>
        <p className="font-cond mt-1 text-[11px] tracking-[0.1em] text-dim">
          Patch {version} · pool personnel · enregistré localement
        </p>
      </header>
      <TierListEditor version={version} champions={champions} />
    </div>
  );
}

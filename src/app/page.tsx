"use client";

import { useEffect, useState } from "react";
import { DraftBoard } from "@/components/DraftBoard";
import { PROFILES, type ProfileKey } from "@/data/profiles";
import { loadChampions } from "@/lib/ddragon";
import type { Champion } from "@/lib/types";
import { useDraft } from "@/state/useDraft";

export default function Home() {
  const [version, setVersion] = useState<string | null>(null);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const draft = useDraft();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadChampions();
        if (cancelled) return;
        setVersion(data.version);
        setChampions(data.champions);
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? e.message
            : "Impossible de charger les champions depuis Data Dragon.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-[1240px] px-3.5 py-3.5">
        <p className="text-bad">{error}</p>
      </div>
    );
  }

  if (!version) {
    return (
      <div className="mx-auto max-w-[1240px] px-3.5 py-3.5">
        <p className="font-cond text-[11px] tracking-[0.1em] text-dim">
          Chargement du patch depuis Data Dragon…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-3.5 pb-14 pt-3.5">
      <header className="flex flex-wrap items-end justify-between gap-2.5 border-b border-line pb-2.5">
        <div>
          <h1 className="font-cond text-[26px] leading-none tracking-[0.14em]">
            Draft<span className="text-gold">.</span>board
          </h1>
          <p className="font-cond mt-1 text-[11px] tracking-[0.1em] text-dim">
            Patch {version} · {champions.length} champions · aucune donnée stockée
          </p>
        </div>
        <button
          type="button"
          onClick={draft.reset}
          className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Nouvelle draft
        </button>
      </header>

      <div className="my-3 flex flex-wrap gap-1.5">
        <span className="font-cond self-center text-[11px] tracking-[0.1em] text-dim mr-1">
          Style visé
        </span>
        {(Object.keys(PROFILES) as ProfileKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => draft.setProfile(key)}
            className={`font-cond border px-1.5 py-0.5 text-[11px] tracking-[0.08em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
              draft.profileKey === key
                ? "border-gold bg-gold text-[#0B0F16]"
                : "border-line bg-panel2 text-txt hover:border-gold hover:text-gold"
            }`}
          >
            {PROFILES[key].name}
          </button>
        ))}
      </div>

      <DraftBoard
        version={version}
        champions={champions}
        picks={draft.picks}
        bans={draft.bans}
        used={draft.used}
        onSetPick={draft.setPick}
        onSetBan={draft.setBan}
      />
    </div>
  );
}

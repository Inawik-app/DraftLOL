"use client";

import { useMemo, useState } from "react";
import { championIconUrl } from "@/lib/ddragon";
import { parsePlayerStats } from "@/lib/playerStats";
import { subsequenceScore } from "@/lib/search";
import type { Champion, Player, TierLabel } from "@/lib/types";
import { ROLE_LABELS } from "@/state/useDraft";

const TIER_ORDER: TierLabel[] = ["S", "A", "B"];

type Props = {
  open: boolean;
  onToggle: () => void;
  version: string;
  champions: Champion[];
  players: Player[];
  onUpdatePlayer: (index: number, patch: Partial<Player>) => void;
  onCycleTier: (index: number, champId: string) => void;
  onRemoveFromPool: (index: number, champId: string) => void;
};

export function PlayersPanel({
  open,
  onToggle,
  version,
  champions,
  players,
  onUpdatePlayer,
  onCycleTier,
  onRemoveFromPool,
}: Props) {
  return (
    <section className="mt-4 border border-line bg-panel p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-cond text-base">Joueurs, tier lists et stats perso</h2>
          <p className="font-cond text-[11px] tracking-[0.1em] text-dim">
            Tout reste local — le lien op.gg n&apos;est jamais requêté.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          {open ? "Masquer" : "Joueurs"}
        </button>
      </div>

      {open && (
        <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-2.5">
          {ROLE_LABELS.map((label, i) => (
            <PlayerCard
              key={label}
              roleLabel={label}
              version={version}
              data={players[i]}
              champions={champions}
              onUpdate={(patch) => onUpdatePlayer(i, patch)}
              onCycleTier={(id) => onCycleTier(i, id)}
              onRemove={(id) => onRemoveFromPool(i, id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PlayerCard({
  roleLabel,
  version,
  data,
  champions,
  onUpdate,
  onCycleTier,
  onRemove,
}: {
  roleLabel: string;
  version: string;
  data: Player;
  champions: Champion[];
  onUpdate: (patch: Partial<Player>) => void;
  onCycleTier: (champId: string) => void;
  onRemove: (champId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [statsInvalid, setStatsInvalid] = useState(false);

  const found = useMemo(() => {
    if (!query.trim()) return [];
    return champions
      .map((c) => ({ c, s: subsequenceScore(query, c.name) }))
      .filter((x) => x.s !== null)
      .sort((a, b) => (b.s as number) - (a.s as number))
      .slice(0, 4)
      .map((x) => x.c);
  }, [query, champions]);

  const pool = Object.entries(data.tiers).sort(
    (a, b) =>
      TIER_ORDER.indexOf(a[1] as TierLabel) -
      TIER_ORDER.indexOf(b[1] as TierLabel),
  );

  return (
    <div className="border border-line bg-panel2 p-2">
      <div className="font-cond text-[11px] tracking-[0.1em] text-gold">
        {roleLabel}
      </div>
      <input
        className="mb-1 w-full border border-line bg-ink px-1.5 py-1 text-xs text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
        placeholder="Pseudo"
        value={data.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
      />
      <input
        className="mb-1 w-full border border-line bg-ink px-1.5 py-1 text-xs text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
        placeholder="Lien op.gg / u.gg"
        value={data.opgg}
        onChange={(e) => onUpdate({ opgg: e.target.value })}
      />
      {data.opgg.trim() && (
        <a
          href={data.opgg}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-1 block truncate text-[11px] text-gold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          {data.opgg}
        </a>
      )}

      <input
        className="mb-1 w-full border border-line bg-ink px-1.5 py-1 text-xs text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
        placeholder="Ajouter au pool…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {found.map((c) => (
        <button
          key={c.id}
          type="button"
          className="font-cond mb-1 mr-1 border border-line bg-ink px-1.5 py-0.5 text-[11px] tracking-[0.08em] text-txt hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          onClick={() => {
            onCycleTier(c.id);
            setQuery("");
          }}
        >
          + {c.name}
        </button>
      ))}

      <div className="mt-1.5">
        {pool.length === 0 && (
          <span className="text-[11px] text-dim">Pool vide.</span>
        )}
        {pool.map(([id, tier]) => (
          <div key={id} className="flex items-center gap-1.5 py-0.5 text-[11px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={championIconUrl(version, id)}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5"
            />
            <button
              type="button"
              title="Changer de tier"
              aria-label={`Tier ${tier} pour ${id}, cliquer pour changer`}
              className="font-cond flex h-11 min-w-11 items-center justify-center border border-line bg-ink px-2 text-[10px] text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold min-[900px]:h-[18px] min-[900px]:min-w-[18px] min-[900px]:px-0"
              onClick={() => onCycleTier(id)}
            >
              {tier}
            </button>
            <span className="flex-1 truncate">{id}</span>
            <button
              type="button"
              title="Retirer"
              aria-label={`Retirer ${id} du pool`}
              className="font-cond flex h-11 min-w-11 items-center justify-center border border-line bg-ink text-[10px] text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold min-[900px]:h-[18px] min-[900px]:min-w-[18px]"
              onClick={() => onRemove(id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <details className="mt-1.5">
        <summary className="font-cond cursor-pointer text-[11px] tracking-[0.1em] text-dim">
          Stats perso (JSON)
        </summary>
        <textarea
          rows={4}
          className={`mt-1 w-full resize-y border bg-ink px-1.5 py-1 font-mono text-[10px] text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold ${
            statsInvalid ? "border-bad" : "border-line"
          }`}
          placeholder={`{"Ahri":{"games":42,"wr":57,"vs":{"Zed":45,"Syndra":63}}}`}
          defaultValue={
            Object.keys(data.stats || {}).length
              ? JSON.stringify(data.stats)
              : ""
          }
          onBlur={(e) => {
            const result = parsePlayerStats(e.target.value);
            if (!result.ok) {
              setStatsInvalid(true);
              return;
            }
            setStatsInvalid(false);
            onUpdate({ stats: result.stats });
          }}
        />
      </details>
    </div>
  );
}

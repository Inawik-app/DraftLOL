"use client";

import { useMemo, useState } from "react";
import { championIconUrl } from "@/lib/ddragon";

type Props = {
  version: string;
  lockedByGame: Map<number, string[]>;
  champNameById: Map<string, string>;
};

/** Collapsed by default; fixed header height whether open or closed. */
export function LockedChampionsPanel({
  version,
  lockedByGame,
  champNameById,
}: Props) {
  const [open, setOpen] = useState(false);

  const total = useMemo(() => {
    const ids = new Set<string>();
    for (const list of lockedByGame.values()) {
      for (const id of list) ids.add(id);
    }
    return ids.size;
  }, [lockedByGame]);
  if (total === 0) return null;

  const games = [...lockedByGame.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <section className="mt-3 border border-line bg-panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
        style={{ minHeight: "36px", maxHeight: "36px" }}
      >
        <span className="font-cond text-[11px] tracking-[0.1em] text-txt">
          Champions verrouillés
        </span>
        <span className="font-cond text-[11px] tracking-[0.08em] text-dim">
          {total} · {open ? "Replier" : "Déplier"}
        </span>
      </button>
      <div
        className={`overflow-hidden border-t border-line transition-[max-height] duration-200 ${
          open ? "max-h-[280px] overflow-y-auto" : "max-h-0"
        }`}
      >
        <div className="space-y-2 px-3 py-2">
          {games.map(([gameNum, ids]) => (
            <div key={gameNum}>
              <p className="font-cond mb-1 text-[10px] tracking-[0.1em] text-gold">
                Game {gameNum}
              </p>
              <div className="flex flex-wrap gap-1">
                {ids.map((id) => (
                  <span
                    key={`${gameNum}-${id}`}
                    title={champNameById.get(id) ?? id}
                    className="inline-flex items-center gap-0.5 border border-line bg-panel2 px-0.5 py-px text-[10px] text-dim"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={championIconUrl(version, id)}
                      alt=""
                      width={18}
                      height={18}
                      className="h-[18px] w-[18px] brightness-50 grayscale"
                    />
                    <span className="font-cond max-w-[72px] truncate">
                      {champNameById.get(id) ?? id}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

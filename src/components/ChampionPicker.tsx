"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { championIconUrl } from "@/lib/ddragon";
import { subsequenceScore } from "@/lib/search";
import type { Champion } from "@/lib/types";

export type PickerTarget = {
  team: "blue" | "red";
  kind: "pick" | "ban";
  index: number;
};

type Props = {
  open: boolean;
  title: string;
  champions: Champion[];
  version: string;
  used: Set<string>;
  triggerRef: RefObject<HTMLElement | null>;
  onPick: (champ: Champion | null) => void;
  onClose: () => void;
};

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
}

export function ChampionPicker({
  open,
  title,
  champions,
  version,
  used,
  triggerRef,
  onPick,
  onClose,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const results = useMemo(() => {
    const available = champions.filter((c) => !used.has(c.id));
    if (!query.trim()) {
      return available.slice(0, 40);
    }
    return available
      .map((c) => ({ c, s: subsequenceScore(query, c.name) }))
      .filter((x) => x.s !== null)
      .sort((a, b) => (b.s as number) - (a.s as number))
      .slice(0, 40)
      .map((x) => x.c);
  }, [champions, used, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = focusableWithin(panelRef.current);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [open, triggerRef]);

  if (!open) return null;

  const onListKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && results[selected]) {
      e.preventDefault();
      onPick(results[selected]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(4,7,12,0.82)] px-3 pt-[8vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[560px] border border-line bg-panel shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
        onKeyDown={onListKey}
      >
        <div className="flex items-center justify-between px-3 pt-2">
          <span id={titleId} className="font-cond text-[11px] tracking-[0.12em] text-dim">
            {title}
          </span>
          <button
            type="button"
            className="font-cond border border-line bg-panel2 px-2 py-0.5 text-[11px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tape les lettres dans l'ordre — kss, mrgn, twf…"
          className="font-cond w-full border-0 border-b border-line bg-ink px-3.5 py-3 text-base tracking-[0.06em] text-txt outline-none"
          aria-autocomplete="list"
          aria-controls="picker-results"
        />

        <div id="picker-results" role="listbox" className="max-h-[52vh] overflow-auto">
          {results.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={i === selected}
              className={`flex w-full items-center gap-2 border-0 border-b border-[#141C27] px-2.5 py-1.5 text-left text-txt transition ${
                i === selected ? "bg-panel2" : "bg-transparent"
              } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => onPick(c)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={championIconUrl(version, c.id)}
                alt=""
                width={34}
                height={34}
                className="h-[34px] w-[34px] shrink-0"
              />
              <span className="font-cond text-[15px]">{c.name}</span>
            </button>
          ))}
          {!results.length && (
            <div className="px-3.5 py-3.5 text-dim">
              Aucun champion disponible pour ces lettres.
            </div>
          )}
        </div>

        <div className="border-t border-line px-3 py-1.5">
          <button
            type="button"
            className="font-cond border border-line bg-panel2 px-2 py-0.5 text-[11px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            onClick={() => onPick(null)}
          >
            Vider le cadre
          </button>
        </div>
      </div>
    </div>
  );
}

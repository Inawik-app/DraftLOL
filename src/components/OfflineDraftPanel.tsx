"use client";

import { useRef, useState } from "react";
import { extractToken, formatShareUrl } from "@/lib/token";

type LoadResult =
  | { ok: true; patchWarning?: string }
  | { ok: false; reason: string };

type Props = {
  offlineToken: string;
  onLoadOfflineDraft: (raw: string) => LoadResult;
};

export const OFFLINE_CLIPBOARD_DENIED_MSG =
  "Le navigateur a refusé la copie automatique. Le token est sélectionné dans le champ ci-dessus — appuie sur Ctrl+C (Cmd+C sur Mac) pour le copier.";

export function OfflineDraftPanel({ offlineToken, onLoadOfflineDraft }: Props) {
  const tokenFieldRef = useRef<HTMLInputElement>(null);
  const [tokenIn, setTokenIn] = useState("");
  const [flash, setFlash] = useState("");
  const [loadError, setLoadError] = useState("");
  const [patchWarning, setPatchWarning] = useState("");
  const [clipboardError, setClipboardError] = useState("");

  const say = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 2600);
  };

  const copyExport = async () => {
    setClipboardError("");
    const url = formatShareUrl(offlineToken);
    try {
      await navigator.clipboard.writeText(url);
      say("Export DRAFT1 copié.");
    } catch {
      tokenFieldRef.current?.focus();
      tokenFieldRef.current?.select();
      setClipboardError(OFFLINE_CLIPBOARD_DENIED_MSG);
    }
  };

  const load = () => {
    setPatchWarning("");
    const extracted = extractToken(tokenIn);
    if (!extracted) {
      setLoadError(
        "Aucun token DRAFT1 reconnu. Colle un export ou un lien contenant DRAFT1.",
      );
      return;
    }
    const result = onLoadOfflineDraft(extracted);
    if (result.ok) {
      setLoadError("");
      setTokenIn("");
      if (result.patchWarning) {
        setPatchWarning(result.patchWarning);
      } else {
        say("Draft hors ligne chargée.");
      }
    } else {
      setLoadError(result.reason);
    }
  };

  return (
    <section className="mt-4 border border-line bg-panel p-3">
      <h2 className="font-cond text-base">Export draft hors ligne</h2>
      <p className="font-cond text-[11px] tracking-[0.1em] text-dim">
        Snapshot figé DRAFT1. — picks, bans, profil et tier lists embarquées. Pas
        de temps réel : pour une salle live, utilise le lien court ci-dessus.
      </p>

      {flash ? (
        <p className="font-cond mt-1 text-[11px] tracking-[0.1em] text-gold">
          {flash}
        </p>
      ) : null}

      {clipboardError ? (
        <p className="mt-1.5 text-[11px] text-warn" role="alert">
          {clipboardError}
        </p>
      ) : null}

      {patchWarning ? (
        <p className="mt-1.5 text-[11px] text-warn" role="status">
          {patchWarning}
        </p>
      ) : null}

      <div className="mt-2 flex gap-1.5">
        <input
          ref={tokenFieldRef}
          readOnly
          value={offlineToken}
          onFocus={(e) => e.target.select()}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="min-w-0 flex-1 border border-line bg-ink px-1.5 py-1 font-mono text-[10px] text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
          aria-label="Token d'export DRAFT1"
        />
        <button
          type="button"
          onClick={copyExport}
          disabled={!offlineToken}
          className="font-cond shrink-0 border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:text-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Exporter la draft
        </button>
      </div>

      <div className="mt-2 flex gap-1.5">
        <input
          value={tokenIn}
          onChange={(e) => {
            setTokenIn(e.target.value);
            setLoadError("");
          }}
          placeholder="Coller un export DRAFT1. reçu…"
          className="min-w-0 flex-1 border border-line bg-ink px-1.5 py-1 font-mono text-[10px] text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
          aria-label="Importer une draft hors ligne"
        />
        <button
          type="button"
          onClick={load}
          disabled={!tokenIn.trim()}
          className="font-cond shrink-0 border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:text-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Importer
        </button>
      </div>

      {loadError ? (
        <p className="mt-1.5 text-[11px] text-bad" role="alert">
          {loadError}
        </p>
      ) : null}
    </section>
  );
}

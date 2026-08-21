"use client";

import { useState } from "react";

type Props = {
  token: string;
  onLoadToken: (raw: string) => { ok: true } | { ok: false; reason: string };
};

export function TokenPanel({ token, onLoadToken }: Props) {
  const [tokenIn, setTokenIn] = useState("");
  const [flash, setFlash] = useState("");
  const [loadError, setLoadError] = useState("");

  const say = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 2600);
  };

  const copyLink = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}#${token}`
        : token;
    try {
      await navigator.clipboard.writeText(url);
      say("Lien copié.");
    } catch {
      say(
        "Copie refusée par le navigateur — sélectionne le champ à la main.",
      );
    }
  };

  const load = () => {
    const result = onLoadToken(tokenIn);
    if (result.ok) {
      setLoadError("");
      setTokenIn("");
      say("Salle chargée.");
    } else {
      setLoadError(result.reason);
    }
  };

  return (
    <section className="mt-4 border border-line bg-panel p-3">
      <h2 className="font-cond text-base">Token de salle</h2>
      <p className="font-cond text-[11px] tracking-[0.1em] text-dim">
        Colle-le à ton équipe pour partager la draft, les tier lists et le style
        visé.
      </p>

      {flash && (
        <p className="font-cond mt-1 text-[11px] tracking-[0.1em] text-gold">
          {flash}
        </p>
      )}

      <div className="mt-2 flex gap-1.5">
        <input
          readOnly
          value={token}
          onFocus={(e) => e.target.select()}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="min-w-0 flex-1 border border-line bg-ink px-1.5 py-1 font-mono text-[10px] text-gold focus:outline focus:outline-1 focus:outline-gold"
          aria-label="Token de salle"
        />
        <button
          type="button"
          onClick={copyLink}
          className="font-cond shrink-0 border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Copier le lien
        </button>
      </div>

      <div className="mt-2 flex gap-1.5">
        <input
          value={tokenIn}
          onChange={(e) => {
            setTokenIn(e.target.value);
            setLoadError("");
          }}
          placeholder="Coller un token reçu…"
          className="min-w-0 flex-1 border border-line bg-ink px-1.5 py-1 font-mono text-[10px] text-txt focus:outline focus:outline-1 focus:outline-gold"
          aria-label="Coller un token"
        />
        <button
          type="button"
          onClick={load}
          disabled={!tokenIn.trim()}
          className="font-cond shrink-0 border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Charger
        </button>
      </div>

      {loadError && (
        <p className="mt-1.5 text-[11px] text-bad" role="alert">
          {loadError}
        </p>
      )}
    </section>
  );
}

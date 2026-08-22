"use client";

import { useRef, useState } from "react";
import {
  seriesExportFilename,
  type GameResult,
  type LockScope,
  type SeriesState,
} from "@/lib/series";

type Props = {
  series: SeriesState;
  lockedCount: number;
  canExport: boolean;
  onToggleSeries: (active: boolean) => void;
  onSetLockScope: (scope: LockScope) => void;
  onValidateGame: (result: GameResult) => void;
  onEndSeries: () => void;
  onExport: () => string | null;
  onImport: (raw: unknown) => void;
};

/** Fixed-width header slot — geometry unchanged when series is inactive. */
export function SeriesControls({
  series,
  lockedCount,
  canExport,
  onToggleSeries,
  onSetLockScope,
  onValidateGame,
  onEndSeries,
  onExport,
  onImport,
}: Props) {
  const [pendingResult, setPendingResult] = useState(false);
  const [pendingEnd, setPendingEnd] = useState(false);
  const [importError, setImportError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleToggle = () => {
    if (series.active) {
      setPendingEnd(true);
      return;
    }
    onToggleSeries(true);
  };

  const confirmEnd = () => {
    setPendingEnd(false);
    onEndSeries();
  };

  const handleExport = () => {
    const payload = onExport();
    if (!payload) return;
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = seriesExportFilename();
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    setImportError("");
    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;
      onImport(raw);
    } catch (e) {
      if (e instanceof SyntaxError) {
        setImportError("Fichier de série illisible.");
        return;
      }
      const msg =
        e instanceof Error ? e.message : "Fichier de série illisible.";
      setImportError(msg);
    }
  };

  return (
    <div
      className="relative shrink-0"
      style={{ width: "640px", height: "52px" }}
    >
      <div
        className={`absolute inset-0 flex items-end gap-1.5 ${
          series.active ? "" : "invisible pointer-events-none"
        }`}
        aria-hidden={!series.active}
      >
        <span className="font-cond shrink-0 border border-gold bg-ink px-2 py-1 text-[11px] tracking-[0.08em] text-gold">
          Game {series.gameNumber}
        </span>
        <select
          value={series.lockScope}
          onChange={(e) => onSetLockScope(e.target.value as LockScope)}
          className="font-cond w-[130px] shrink-0 border border-line bg-panel2 px-1.5 py-1 text-[10px] tracking-[0.06em] text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
          aria-label="Périmètre du verrou fearless"
        >
          <option value="both">Deux équipes</option>
          <option value="ally">Nos picks seulement</option>
        </select>
        <button
          type="button"
          onClick={() => setPendingResult(true)}
          className="font-cond shrink-0 border border-line bg-panel2 px-2 py-1 text-[11px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Valider la game
        </button>
        <button
          type="button"
          onClick={() => setPendingEnd(true)}
          className="font-cond shrink-0 border border-line bg-panel2 px-2 py-1 text-[11px] tracking-[0.08em] text-dim transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Terminer la série
        </button>
        <button
          type="button"
          disabled={!canExport}
          onClick={handleExport}
          className="font-cond shrink-0 border border-line bg-panel2 px-2 py-1 text-[11px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold disabled:text-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Exporter la série
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="font-cond shrink-0 border border-line bg-panel2 px-2 py-1 text-[11px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Importer une série
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleImportFile(file);
          }}
        />
        {lockedCount > 0 ? (
          <span className="font-cond shrink-0 text-[10px] tracking-[0.08em] text-dim">
            {lockedCount} verrou{lockedCount === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="font-cond shrink-0 text-[10px] tracking-[0.08em] text-dim opacity-0">
            0 verrous
          </span>
        )}
      </div>

      <div className="absolute bottom-0 left-0 flex items-end gap-1.5">
        <label className="font-cond flex shrink-0 cursor-pointer items-center gap-1.5 border border-line bg-panel2 px-2 py-1 text-[11px] tracking-[0.08em] text-txt transition hover:border-gold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold">
          <input
            type="checkbox"
            checked={series.active}
            onChange={handleToggle}
            className="accent-gold"
          />
          Série fearless
        </label>
      </div>

      {importError ? (
        <p
          className="absolute -bottom-4 left-0 max-w-[640px] truncate text-[10px] text-bad"
          role="alert"
        >
          {importError}
        </p>
      ) : null}

      {pendingResult ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(4,7,12,0.82)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="result-dialog-title"
        >
          <div className="w-[320px] border border-line bg-panel p-3">
            <p
              id="result-dialog-title"
              className="font-cond text-[13px] tracking-[0.08em] text-txt"
            >
              Résultat de la game {series.gameNumber} ?
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPendingResult(false);
                  onValidateGame("win");
                }}
                className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[11px] tracking-[0.08em] text-gold hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Victoire
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingResult(false);
                  onValidateGame("loss");
                }}
                className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[11px] tracking-[0.08em] text-txt hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Défaite
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingResult(false);
                  onValidateGame(null);
                }}
                className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[11px] tracking-[0.08em] text-dim hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Non renseigné
              </button>
              <button
                type="button"
                onClick={() => setPendingResult(false)}
                className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[11px] tracking-[0.08em] text-dim hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingEnd ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(4,7,12,0.82)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-series-title"
        >
          <div className="w-[320px] border border-line bg-panel p-3">
            <p
              id="end-series-title"
              className="font-cond text-[13px] tracking-[0.08em] text-txt"
            >
              Terminer la série fearless ? Les verrous seront levés.
            </p>
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={confirmEnd}
                className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[11px] tracking-[0.08em] text-bad hover:border-bad focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Terminer
              </button>
              <button
                type="button"
                onClick={() => setPendingEnd(false)}
                className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[11px] tracking-[0.08em] text-dim hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

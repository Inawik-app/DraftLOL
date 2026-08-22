"use client";

import { useRef, useState } from "react";
import {
  seriesExportFilename,
  type GameResult,
  type LockScope,
  type SeriesState,
} from "@/lib/series";

/** Fixed column widths (px) — geometry stable active/inactive. */
export const SERIES_BAR_COLUMNS_PX = [
  148, // bascule
  76, // Game N
  168, // périmètre — fits "Nos picks seulement"
  118, // Valider la game
  128, // Terminer la série
  118, // Exporter la série
  132, // Importer une série
] as const;

export const SERIES_BAR_HEIGHT_PX = 36;

type Props = {
  series: SeriesState;
  canExport: boolean;
  onToggleSeries: (active: boolean) => void;
  onSetLockScope: (scope: LockScope) => void;
  onValidateGame: (result: GameResult) => void;
  onEndSeries: () => void;
  onExport: () => string | null;
  onImport: (raw: unknown) => void;
};

const btnClass =
  "font-cond h-[28px] w-full border border-line bg-panel2 px-2 text-[11px] tracking-[0.08em] transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

function cellClass(active: boolean): string {
  return active ? "min-w-0" : "invisible pointer-events-none min-w-0";
}

export function SeriesControls({
  series,
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
  const active = series.active;

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
    <>
      <div
        className="mt-2 grid items-center gap-x-1.5"
        style={{
          height: `${SERIES_BAR_HEIGHT_PX}px`,
          gridTemplateColumns: SERIES_BAR_COLUMNS_PX.map((w) => `${w}px`).join(
            " ",
          ),
        }}
        data-testid="series-controls-bar"
      >
        <label
          className="font-cond flex h-[28px] cursor-pointer items-center gap-1.5 border border-line bg-panel2 px-2 text-[11px] tracking-[0.08em] text-txt transition hover:border-gold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold"
          data-testid="series-col-toggle"
        >
          <input
            type="checkbox"
            checked={series.active}
            onChange={handleToggle}
            className="accent-gold"
          />
          Série fearless
        </label>

        <span
          className={`font-cond flex h-[28px] items-center justify-center border border-gold bg-ink px-2 text-[11px] tracking-[0.08em] text-gold ${cellClass(active)}`}
          data-testid="series-col-game"
          aria-hidden={!active}
        >
          Game {series.gameNumber}
        </span>

        <select
          value={series.lockScope}
          onChange={(e) => onSetLockScope(e.target.value as LockScope)}
          className={`font-cond h-[28px] w-full border border-line bg-panel2 px-1.5 text-[11px] tracking-[0.06em] text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold ${cellClass(active)}`}
          aria-label="Périmètre du verrou fearless"
          aria-hidden={!active}
          tabIndex={active ? 0 : -1}
          data-testid="series-col-scope"
        >
          <option value="both">Deux équipes</option>
          <option value="ally">Nos picks seulement</option>
        </select>

        <button
          type="button"
          onClick={() => setPendingResult(true)}
          className={`${btnClass} text-txt ${cellClass(active)}`}
          aria-hidden={!active}
          tabIndex={active ? 0 : -1}
          data-testid="series-col-validate"
        >
          Valider la game
        </button>

        <button
          type="button"
          onClick={() => setPendingEnd(true)}
          className={`${btnClass} text-dim ${cellClass(active)}`}
          aria-hidden={!active}
          tabIndex={active ? 0 : -1}
          data-testid="series-col-end"
        >
          Terminer la série
        </button>

        <button
          type="button"
          disabled={!canExport}
          onClick={handleExport}
          className={`${btnClass} text-txt disabled:text-dim ${cellClass(active)}`}
          aria-hidden={!active}
          tabIndex={active ? 0 : -1}
          data-testid="series-col-export"
        >
          Exporter la série
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`${btnClass} text-txt ${cellClass(active)}`}
          aria-hidden={!active}
          tabIndex={active ? 0 : -1}
          data-testid="series-col-import"
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
      </div>

      {importError ? (
        <p className="mt-1 text-[10px] text-bad" role="alert">
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
    </>
  );
}

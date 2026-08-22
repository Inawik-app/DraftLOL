"use client";

import { useId, useState } from "react";
import {
  normalizeOpggInput,
  type OpggRegion,
  type RoleProfile,
} from "@/lib/opggLink";
import { OPGG_REGIONS } from "@/lib/opggLink";

type Props = {
  roleLabel: string;
  teamLabel: string;
  profile: RoleProfile;
  region: OpggRegion;
  showRegionSelector?: boolean;
  onRegionChange?: (region: OpggRegion) => void;
  onUpdate: (patch: Partial<RoleProfile>) => void;
};

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
    >
      <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 1 1-1.061-1.06l1.224-1.225a1 1 0 0 0-1.414-1.414l-1.225 1.224a.75.75 0 1 1-1.06-1.06l1.224-1.225ZM6.5 9.964a2.5 2.5 0 0 1 3.536 0l3.268 3.268a2.5 2.5 0 0 1-3.536 3.536l-1.768-1.768a.75.75 0 0 1 1.06-1.06l1.708 1.707a1 1 0 1 0 1.414-1.414L8.318 11.59a1 1 0 0 0 0-1.414l-1.768-1.768a.75.75 0 1 1 1.06-1.06l1.768 1.768Z" />
      <path d="M4.5 11.036a2.5 2.5 0 0 1 0-3.536l3.268-3.268a2.5 2.5 0 1 1 3.536 3.536l-1.225 1.224a.75.75 0 0 1-1.061-1.06l1.224-1.225a1 1 0 0 0-1.414-1.414L6.5 7.318a1 1 0 0 0 0 1.414l1.768 1.768a.75.75 0 0 1-1.06 1.06L4.5 11.036Z" />
    </svg>
  );
}

export function RoleProfileRow({
  roleLabel,
  teamLabel,
  profile,
  region,
  showRegionSelector = false,
  onRegionChange,
  onUpdate,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkError, setLinkError] = useState("");
  const editId = useId();

  const displayName = profile.name.trim() || "—";
  const linkLabel = `Ouvrir l'op.gg de ${profile.name.trim() || "ce joueur"} (${roleLabel}, ${teamLabel})`;
  const hasLink = profile.opgg.trim().length > 0;

  const startEdit = () => {
    setNameDraft(profile.name);
    setLinkDraft("");
    setLinkError("");
    setEditing(true);
  };

  const commitEdit = () => {
    let nextName = nameDraft.trim();
    let nextOpgg = profile.opgg;

    if (linkDraft.trim()) {
      const normalized = normalizeOpggInput(linkDraft, region, nextName);
      if (!normalized) {
        setLinkError("Entrée vide.");
        return;
      }
      if ("error" in normalized) {
        setLinkError("Colle une URL op.gg ou un Riot ID pseudo#tag.");
        return;
      }
      nextName = normalized.name.trim() || nextName;
      nextOpgg = normalized.opgg;
    }

    onUpdate({ name: nextName, opgg: nextOpgg });
    setEditing(false);
    setLinkError("");
  };

  const cancelEdit = () => {
    setEditing(false);
    setLinkError("");
  };

  return (
    <div className="border border-line bg-panel2 px-2 py-1.5">
      {showRegionSelector && onRegionChange ? (
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="font-cond text-[10px] tracking-[0.08em] text-dim">
            Région op.gg
          </span>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value as OpggRegion)}
            className="border border-line bg-ink px-1.5 py-0.5 text-[11px] text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
            aria-label="Région op.gg"
          >
            {OPGG_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-dim">
            Raccourci uniquement — aucune donnée n&apos;est lue depuis op.gg.
          </span>
        </div>
      ) : null}

      {!editing ? (
        <div className="flex items-center gap-2">
          <span className="font-cond w-9 shrink-0 text-[10px] tracking-[0.08em] text-gold">
            {roleLabel}
          </span>
          <span className="font-cond min-w-0 flex-1 truncate text-[12px] text-txt">
            {displayName}
          </span>
          {hasLink ? (
            <a
              href={profile.opgg}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={linkLabel}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-line bg-ink text-gold transition hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <LinkIcon />
            </a>
          ) : (
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-line bg-ink text-dim opacity-40"
            >
              <LinkIcon />
            </span>
          )}
          <button
            type="button"
            onClick={startEdit}
            aria-label={`Modifier ${roleLabel} (${teamLabel})`}
            className="font-cond h-8 shrink-0 border border-line bg-ink px-2 text-[10px] tracking-[0.08em] text-dim hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Éditer
          </button>
        </div>
      ) : (
        <div className="space-y-1.5" id={editId}>
          <div className="font-cond text-[10px] tracking-[0.08em] text-dim">
            {roleLabel} · {teamLabel}
          </div>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Pseudo"
            className="w-full border border-line bg-ink px-1.5 py-1 text-xs text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
            aria-label={`Pseudo ${roleLabel}`}
          />
          <input
            value={linkDraft}
            onChange={(e) => {
              setLinkDraft(e.target.value);
              setLinkError("");
            }}
            placeholder="URL op.gg ou pseudo#tag"
            className="w-full border border-line bg-ink px-1.5 py-1 font-mono text-[10px] text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
            aria-label={`Lien op.gg ${roleLabel}`}
          />
          {linkError ? (
            <p className="text-[10px] text-bad" role="alert">
              {linkError}
            </p>
          ) : null}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={commitEdit}
              className="font-cond border border-line bg-ink px-2 py-1 text-[11px] tracking-[0.08em] text-gold hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              OK
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="font-cond border border-line bg-ink px-2 py-1 text-[11px] tracking-[0.08em] text-dim hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

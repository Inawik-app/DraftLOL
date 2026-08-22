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

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3 w-3 shrink-0"
      aria-hidden="true"
    >
      <path d="M6.5 2.5a.75.75 0 0 0 0 1.5h3.19L3.22 10.47a.75.75 0 1 0 1.06 1.06l6.47-6.47v3.19a.75.75 0 0 0 1.5 0v-5a.75.75 0 0 0-.75-.75h-5Z" />
      <path d="M8.5 11.5a.75.75 0 0 0-1.5 0v2.25A1.75 1.75 0 0 0 8.75 15.5h2.25A1.75 1.75 0 0 0 12.75 13.75v-2.25a.75.75 0 0 0-1.5 0v2.25a.25.25 0 0 1-.25.25H8.75a.25.25 0 0 1-.25-.25v-2.25Z" />
    </svg>
  );
}

const OPGG_LINK_CLASS =
  "font-cond inline-flex h-8 w-[72px] shrink-0 cursor-pointer items-center justify-center gap-0.5 text-[10px] tracking-[0.06em] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

const OPGG_PLACEHOLDER_CLASS =
  "font-cond inline-flex h-8 w-[72px] shrink-0 items-center justify-center gap-0.5 text-[10px] tracking-[0.06em] text-dim opacity-40";

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
              className={`${OPGG_LINK_CLASS} text-gold`}
            >
              OP.GG
              <ExternalLinkIcon />
            </a>
          ) : (
            <span aria-hidden="true" className={OPGG_PLACEHOLDER_CLASS}>
              OP.GG
              <ExternalLinkIcon />
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

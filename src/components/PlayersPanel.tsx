"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { championIconUrl } from "@/lib/ddragon";
import type { OpggRegion, RoleProfile } from "@/lib/opggLink";
import { playerTiersToTierLists, tierListsToPlayerTiers } from "@/lib/tierList";
import { decodeTierSeed, encodeTierSeed } from "@/lib/tierSeed";
import { extractToken } from "@/lib/token";
import type { Player, TierLabel } from "@/lib/types";
import { TIER_LABELS } from "@/lib/types";
import { RoleProfileRow } from "@/components/RoleProfileRow";
import { ROLE_LABELS } from "@/state/useDraft";

const TIER_ORDER = TIER_LABELS;

type Props = {
  version: string;
  players: Player[];
  opggRegion: OpggRegion;
  onSetOpggRegion: (region: OpggRegion) => void;
  onUpdateAllyProfile: (index: number, patch: Partial<RoleProfile>) => void;
  onImportPlayerTiers: (
    index: number,
    tiers: Record<string, TierLabel>,
  ) => void;
  embedded?: boolean;
};

export function PlayersPanel({
  version,
  players,
  opggRegion,
  onSetOpggRegion,
  onUpdateAllyProfile,
  onImportPlayerTiers,
  embedded = false,
}: Props) {
  return (
    <section
      className={`border border-line bg-panel p-3 ${embedded ? "" : "mt-4"}`}
    >
      <div>
        <h2 className="font-cond text-base">Joueurs et tier lists</h2>
        <p className="font-cond text-[11px] tracking-[0.1em] text-dim">
          Profils alliés synchronisés en salle. Importe ou exporte une seed TL1.
          Édition complète sur la page{" "}
          <Link
            href="/tiers"
            className="text-gold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Tier list
          </Link>
          .
        </p>
      </div>

      <div className="mt-2 space-y-1">
        <p className="font-cond text-[10px] tracking-[0.1em] text-dim">
          Équipe alliée — raccourcis op.gg (local)
        </p>
        {ROLE_LABELS.map((label, i) => (
          <RoleProfileRow
            key={`ally-${label}`}
            roleLabel={label}
            teamLabel="équipe alliée"
            profile={{ name: players[i]?.name ?? "", opgg: players[i]?.opgg ?? "" }}
            region={opggRegion}
            showRegionSelector={i === 0}
            onRegionChange={onSetOpggRegion}
            onUpdate={(patch) => onUpdateAllyProfile(i, patch)}
          />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-2.5">
        {ROLE_LABELS.map((label, i) => (
          <PlayerTierCard
            key={label}
            roleLabel={label}
            version={version}
            data={players[i]}
            tiersLink="/tiers"
            onImport={(tiers) => onImportPlayerTiers(i, tiers)}
          />
        ))}
      </div>
    </section>
  );
}

function PlayerTierCard({
  roleLabel,
  version,
  data,
  tiersLink,
  onImport,
}: {
  roleLabel: string;
  version: string;
  data: Player;
  tiersLink: string;
  onImport: (tiers: Record<string, TierLabel>) => void;
}) {
  const [seedIn, setSeedIn] = useState("");
  const [importError, setImportError] = useState("");
  const [importOk, setImportOk] = useState("");
  const [copyFlash, setCopyFlash] = useState("");
  const seedFieldRef = useRef<HTMLInputElement>(null);

  const exportSeed = useMemo(
    () =>
      encodeTierSeed(
        playerTiersToTierLists(data.tiers as Record<string, TierLabel>),
      ),
    [data.tiers],
  );

  const pool = Object.entries(data.tiers).sort(
    (a, b) =>
      TIER_ORDER.indexOf(a[1] as TierLabel) -
      TIER_ORDER.indexOf(b[1] as TierLabel),
  );

  const poolCounts = useMemo(() => {
    const counts = { S: 0, A: 0, B: 0, C: 0 };
    for (const [, tier] of pool) counts[tier as TierLabel] += 1;
    return counts;
  }, [pool]);

  const loadSeed = () => {
    setImportError("");
    setImportOk("");
    const extracted = extractToken(seedIn);
    if (!extracted) {
      setImportError(
        "Aucune seed TL1. reconnue. Colle un token ou un lien contenant TL1.",
      );
      return;
    }
    const decoded = decodeTierSeed(extracted);
    if (!decoded.ok) {
      setImportError(decoded.reason);
      return;
    }
    const tiers = tierListsToPlayerTiers(decoded.lists);
    onImport(tiers);
    setSeedIn("");
    setImportOk(`${Object.keys(tiers).length} champions importés.`);
    window.setTimeout(() => setImportOk(""), 2600);
  };

  const copySeed = async () => {
    setCopyFlash("");
    try {
      await navigator.clipboard.writeText(exportSeed);
      setCopyFlash("Seed copiée.");
    } catch {
      seedFieldRef.current?.focus();
      seedFieldRef.current?.select();
      setCopyFlash("Sélectionne la seed puis Ctrl+C (Cmd+C sur Mac).");
    }
    window.setTimeout(() => setCopyFlash(""), 2600);
  };

  return (
    <div className="border border-line bg-panel2 p-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-cond text-[11px] tracking-[0.1em] text-gold">
          {roleLabel}
          {data.name ? (
            <span className="ml-1 text-dim">· {data.name}</span>
          ) : null}
        </div>
        <Link
          href={tiersLink}
          className="font-cond text-[10px] tracking-[0.08em] text-dim underline-offset-2 hover:text-gold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Éditer →
        </Link>
      </div>

      <div className="mb-1 flex gap-1.5">
        <input
          value={seedIn}
          onChange={(e) => {
            setSeedIn(e.target.value);
            setImportError("");
          }}
          placeholder="Coller seed TL1.…"
          className="min-w-0 flex-1 border border-line bg-ink px-1.5 py-1 font-mono text-[10px] text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
          aria-label={`Importer seed TL1 pour ${roleLabel}`}
        />
        <button
          type="button"
          onClick={loadSeed}
          disabled={!seedIn.trim()}
          className="font-cond shrink-0 border border-line bg-ink px-2 py-1 text-[11px] tracking-[0.08em] text-txt hover:border-gold hover:text-gold disabled:text-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Importer
        </button>
      </div>
      {importError ? (
        <p className="mb-1 text-[10px] text-bad" role="alert">
          {importError}
        </p>
      ) : null}
      {importOk ? (
        <p className="mb-1 text-[10px] text-gold" role="status">
          {importOk}
        </p>
      ) : null}
      {copyFlash ? (
        <p className="mb-1 text-[10px] text-gold" role="status">
          {copyFlash}
        </p>
      ) : null}

      {pool.length > 0 ? (
        <div className="mb-1.5 flex gap-1.5">
          <input
            ref={seedFieldRef}
            readOnly
            value={exportSeed}
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 border border-line bg-ink px-1.5 py-1 font-mono text-[10px] text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
            aria-label={`Seed TL1 exportée pour ${roleLabel}`}
          />
          <button
            type="button"
            onClick={copySeed}
            className="font-cond shrink-0 border border-line bg-ink px-2 py-1 text-[11px] tracking-[0.08em] text-txt hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Copier
          </button>
        </div>
      ) : null}

      <div className="mt-1.5">
        {pool.length === 0 ? (
          <span className="text-[11px] text-dim">
            Pool vide — importe une seed TL1.
          </span>
        ) : (
          <>
            <p className="font-cond mb-1 text-[10px] tracking-[0.08em] text-dim">
              S {poolCounts.S} · A {poolCounts.A} · B {poolCounts.B} · C{" "}
              {poolCounts.C}
            </p>
            <div className="flex flex-wrap gap-1">
              {pool.map(([id, tier]) => (
                <span
                  key={id}
                  title={`${id} — tier ${tier}`}
                  className="inline-flex items-center gap-0.5 border border-line bg-ink px-0.5 py-px text-[10px]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={championIconUrl(version, id)}
                    alt=""
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px]"
                  />
                  <span className="font-cond text-gold">{tier}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

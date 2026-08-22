"use client";

import { useRef, useState } from "react";
import {
  extractRidFromHash,
  formatRoomUrl,
  replaceLocationRid,
} from "@/lib/token";
import { syncRoomFromLocation } from "@/lib/room";

type JoinResult = { ok: true } | { ok: false; reason: string };

type Props = {
  roomId: string;
  onJoinRoom: (rid: string) => void;
};

export const CLIPBOARD_DENIED_MSG =
  "Le navigateur a refusé la copie automatique. Le lien est sélectionné dans le champ ci-dessus — appuie sur Ctrl+C (Cmd+C sur Mac) pour le copier.";

export function RoomLinkPanel({ roomId, onJoinRoom }: Props) {
  const linkFieldRef = useRef<HTMLInputElement>(null);
  const [roomIn, setRoomIn] = useState("");
  const [flash, setFlash] = useState("");
  const [loadError, setLoadError] = useState("");
  const [clipboardError, setClipboardError] = useState("");

  const say = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(""), 2600);
  };

  const copyLink = async () => {
    setClipboardError("");
    const url = formatRoomUrl(roomId);
    try {
      await navigator.clipboard.writeText(url);
      say("Lien de salle copié.");
    } catch {
      linkFieldRef.current?.focus();
      linkFieldRef.current?.select();
      setClipboardError(CLIPBOARD_DENIED_MSG);
    }
  };

  const join = (): JoinResult => {
    const rid = extractRidFromHash(roomIn);
    if (!rid) {
      const reason =
        "Aucune salle reconnue. Colle un lien #r=<uuid> ou l'identifiant de salle.";
      setLoadError(reason);
      return { ok: false, reason };
    }
    setLoadError("");
    setRoomIn("");
    replaceLocationRid(rid);
    syncRoomFromLocation();
    onJoinRoom(rid);
    say("Salle rejointe.");
    return { ok: true };
  };

  return (
    <section className="mt-4 border border-line bg-panel p-3">
      <h2 className="font-cond text-base">Lien de la salle</h2>
      <p className="font-cond text-[11px] tracking-[0.1em] text-dim">
        Partage ce lien court pour rejoindre la draft en temps réel. Picks, bans,
        profil et tier lists se synchronisent via WebRTC.
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

      <div className="mt-2 flex gap-1.5">
        <input
          ref={linkFieldRef}
          readOnly
          value={formatRoomUrl(roomId)}
          onFocus={(e) => e.target.select()}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="min-w-0 flex-1 border border-line bg-ink px-1.5 py-1 font-mono text-[10px] text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
          aria-label="Lien de la salle"
        />
        <button
          type="button"
          onClick={copyLink}
          className="font-cond shrink-0 border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Copier le lien de la salle
        </button>
      </div>

      <div className="mt-2 flex gap-1.5">
        <input
          value={roomIn}
          onChange={(e) => {
            setRoomIn(e.target.value);
            setLoadError("");
          }}
          placeholder="Coller un lien de salle reçu…"
          className="min-w-0 flex-1 border border-line bg-ink px-1.5 py-1 font-mono text-[10px] text-txt focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
          aria-label="Rejoindre une salle"
        />
        <button
          type="button"
          onClick={join}
          disabled={!roomIn.trim()}
          className="font-cond shrink-0 border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:text-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Rejoindre
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

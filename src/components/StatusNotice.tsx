type Tone = "warn" | "info";

type Props = {
  tone?: Tone;
  message: string;
  onDismiss?: () => void;
};

const TONE_CLASS: Record<Tone, string> = {
  warn: "border-warn/40 bg-[#1a1510] text-[#E0C48A]",
  info: "border-line bg-panel2 text-dim",
};

export function StatusNotice({ tone = "warn", message, onDismiss }: Props) {
  return (
    <div
      role="status"
      className={`mb-3 flex items-start gap-2 border px-3 py-2 text-[12px] leading-relaxed ${TONE_CLASS[tone]}`}
    >
      <p className="min-w-0 flex-1">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Masquer l'avertissement"
          onClick={onDismiss}
          className="font-cond shrink-0 border border-line bg-panel px-1.5 py-0.5 text-[10px] tracking-[0.08em] text-txt hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

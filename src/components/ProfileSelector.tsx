"use client";

import { PROFILES, type ProfileKey } from "@/data/profiles";

type Props = {
  value: ProfileKey;
  onChange: (key: ProfileKey) => void;
};

export function ProfileSelector({ value, onChange }: Props) {
  return (
    <div className="my-3 flex flex-wrap gap-1.5">
      <span className="font-cond mr-1 self-center text-[11px] tracking-[0.1em] text-dim">
        Style visé
      </span>
      {(Object.keys(PROFILES) as ProfileKey[]).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`font-cond border px-1.5 py-0.5 text-[11px] tracking-[0.08em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
            value === key
              ? "border-gold bg-gold text-[#0B0F16]"
              : "border-line bg-panel2 text-txt hover:border-gold hover:text-gold"
          }`}
        >
          {PROFILES[key].name}
        </button>
      ))}
    </div>
  );
}

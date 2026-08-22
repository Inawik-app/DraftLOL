"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AppNav() {
  const [hash, setHash] = useState("");

  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  return (
    <nav className="mb-3 flex flex-wrap gap-2 border-b border-line pb-2">
      <Link
        href={`/${hash}`}
        className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        Draft
      </Link>
      <Link
        href={`/tiers${hash}`}
        className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        Tier list
      </Link>
    </nav>
  );
}

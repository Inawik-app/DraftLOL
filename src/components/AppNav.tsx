"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  extractRidFromHash,
  formatDraftPathWithRid,
  loadSessionRoomRid,
} from "@/lib/token";

export function AppNav() {
  const pathname = usePathname();
  const [draftHref, setDraftHref] = useState("/");

  useEffect(() => {
    const read = () => {
      const rid =
        extractRidFromHash(window.location.hash) ?? loadSessionRoomRid();
      setDraftHref(rid ? formatDraftPathWithRid(rid) : "/");
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [pathname]);

  return (
    <nav className="mb-3 flex flex-wrap gap-2 border-b border-line pb-2">
      <Link
        href={draftHref}
        className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        Draft
      </Link>
      <Link
        href="/tiers"
        className="font-cond border border-line bg-panel2 px-2.5 py-1 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        Tier list
      </Link>
    </nav>
  );
}

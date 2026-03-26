"use client";

import { useState } from "react";
import Link from "next/link";
import { useActiveMarathon } from "@/lib/hooks/useMarathon";
import { StartMarathonModal } from "./start-marathon-modal";

export function MarathonStartButton() {
  const { marathon } = useActiveMarathon();
  const [showModal, setShowModal] = useState(false);

  if (marathon) {
    // Als er al een actieve marathon is, linkt de knop naar het scorebord
    return (
      <Link
        href="/marathon"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-extrabold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--color-coral)" }}
      >
        🏁 Marathon bekijken
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 font-extrabold text-sm transition-colors hover:border-[var(--color-coral)] hover:text-[var(--color-coral)] cursor-pointer"
        style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
      >
        🏁 Start Marathon
      </button>
      {showModal && <StartMarathonModal onClose={() => setShowModal(false)} />}
    </>
  );
}

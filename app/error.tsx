"use client";

// Zonder deze error boundary vervangt een mislukte route de héle pagina —
// inclusief de navigatiebalk onderaan. Dan lijkt het alsof de knoppen niet
// werken, terwijl je simpelweg nergens meer naartoe kunt. Deze boundary zit
// binnen de root layout, dus de balk blijft staan en je kunt verder navigeren.
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black" style={{ color: "var(--foreground)" }}>
          Oeps 😬
        </h1>
        <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Deze pagina kon niet geladen worden
        </p>
      </div>

      <div
        className="rounded-3xl p-6 space-y-4"
        style={{ backgroundColor: "var(--card)", border: "2px solid var(--border)" }}
      >
        <div className="text-4xl">🔌</div>
        <p className="font-semibold text-sm" style={{ color: "var(--muted-foreground)" }}>
          Misschien even geen verbinding. Probeer het opnieuw, of ga via de balk
          onderaan naar een andere pagina.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="w-full py-3.5 rounded-2xl font-black text-white text-base"
          style={{ backgroundColor: "var(--color-coral)" }}
        >
          🔄 Opnieuw proberen
        </button>
        {error.digest && (
          <p className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
            {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

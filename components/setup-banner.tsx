export function SetupBanner() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black" style={{ color: "var(--foreground)" }}>
          Spelscores 🎲
        </h1>
      </div>
      <div
        className="rounded-3xl p-6 space-y-4"
        style={{ backgroundColor: "var(--color-warm-yellow)" }}
      >
        <div className="text-4xl">⚙️</div>
        <h2 className="text-xl font-black">Supabase instellen</h2>
        <p className="font-semibold text-sm">
          Maak een <code className="bg-[var(--card)]/60 px-1 rounded">.env.local</code> bestand
          aan in de root van het project:
        </p>
        <pre
          className="bg-[var(--card)]/60 rounded-xl p-3 text-xs font-mono overflow-auto"
        >{`NEXT_PUBLIC_SUPABASE_URL=https://jouw-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...`}</pre>
        <p className="font-semibold text-sm">
          Zie de{" "}
          <strong>README.md</strong> voor stap-voor-stap setup instructies.
        </p>
      </div>
    </div>
  );
}

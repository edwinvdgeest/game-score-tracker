/**
 * Instant "loading.tsx" fallback voor route-navigatie.
 *
 * Zonder dit blijft het scherm bij elke tik op de navigatie leeg staan totdat de server
 * klaar is met data ophalen — op een trage verbinding lijkt het dan alsof de tik niet
 * aangekomen is. Dit skelet toont Next.js meteen, terwijl de echte pagina achter de
 * schermen streamt.
 */
export function PageSkeleton({
  header = true,
  rows = 4,
}: {
  header?: boolean;
  rows?: number;
}) {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      {header && (
        <div className="space-y-2">
          <div
            className="h-8 w-48 rounded-xl"
            style={{ backgroundColor: "var(--color-warm-gray)" }}
          />
          <div
            className="h-4 w-64 max-w-full rounded-lg"
            style={{ backgroundColor: "var(--color-warm-gray)" }}
          />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-2xl border"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          />
        ))}
      </div>
    </div>
  );
}

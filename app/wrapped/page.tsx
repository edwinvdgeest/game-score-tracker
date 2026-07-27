import Link from "next/link";
import { getPlayedYears } from "@/lib/queries";
import { SetupBanner } from "@/components/setup-banner";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Jaaroverzichten",
};

export default async function WrappedIndexPage() {
  let years: number[];
  try {
    years = await getPlayedYears();
  } catch {
    return <SetupBanner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black" style={{ color: "var(--foreground)" }}>
          Jaaroverzicht 📅
        </h1>
        <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Het jaar in cijfers, klaar om te delen
        </p>
      </div>

      {years.length === 0 ? (
        <div
          className="text-center py-12 rounded-3xl font-semibold"
          style={{
            backgroundColor: "var(--color-warm-gray)",
            color: "var(--muted-foreground)",
          }}
        >
          Nog geen potjes om terug te kijken 🎲
        </div>
      ) : (
        <div className="space-y-2">
          {years.map((year) => (
            <Link
              key={year}
              href={`/wrapped/${year}`}
              className="flex items-center justify-between p-4 rounded-2xl border font-extrabold transition-colors hover:border-[var(--color-coral)]"
              style={{ backgroundColor: "var(--card)" }}
            >
              <span className="text-lg">{year}</span>
              <span style={{ color: "var(--muted-foreground)" }}>→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

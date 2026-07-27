import { getStats, getGames } from "@/lib/queries";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { SetupBanner } from "@/components/setup-banner";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Only the data fetch belongs in the try: a try/catch around JSX does not catch
  // render errors, and swallowing them would hide real bugs behind the setup banner.
  let data: [
    Awaited<ReturnType<typeof getStats>>,
    Awaited<ReturnType<typeof getGames>>,
  ];
  try {
    data = await Promise.all([getStats("all"), getGames()]);
  } catch {
    return <SetupBanner />;
  }
  const [initialStats, games] = data;

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl font-black"
          style={{ color: "var(--foreground)" }}
        >
          Scorebord 🏆
        </h1>
        <p
          className="font-semibold"
          style={{ color: "var(--muted-foreground)" }}
        >
          Wie wint er het vaakst?
        </p>
      </div>
      <DashboardClient initialStats={initialStats} games={games} />
    </div>
  );
}

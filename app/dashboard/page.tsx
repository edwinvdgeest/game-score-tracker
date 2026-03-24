import { getStats } from "@/lib/queries";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { SetupBanner } from "@/components/setup-banner";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const initialStats = await getStats("all");

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
        <DashboardClient initialStats={initialStats} />
      </div>
    );
  } catch {
    return <SetupBanner />;
  }
}

import { getSeasonList, getSeasonStandings } from "@/lib/queries";
import { SetupBanner } from "@/components/setup-banner";
import { SeasonsClient } from "@/components/seasons/seasons-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Seizoenen",
};

export default async function SeasonsPage() {
  // Only the data fetch belongs in the try — see the comment in app/dashboard/page.tsx.
  let data: [
    Awaited<ReturnType<typeof getSeasonStandings>>,
    Awaited<ReturnType<typeof getSeasonList>>,
  ];
  try {
    data = await Promise.all([getSeasonStandings(), getSeasonList()]);
  } catch {
    return <SetupBanner />;
  }
  const [currentSeason, seasons] = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black" style={{ color: "var(--foreground)" }}>
          Seizoenen 🏆
        </h1>
        <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Elk kwartaal een nieuwe kans op de titel
        </p>
      </div>
      <SeasonsClient initialSeason={currentSeason} seasons={seasons} />
    </div>
  );
}

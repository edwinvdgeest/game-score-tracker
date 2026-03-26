import { getGuestPlayersWithCounts } from "@/lib/queries";
import { GuestsClient } from "@/components/guests/guests-client";

export const dynamic = "force-dynamic";

export default async function GuestsPage() {
  const guests = await getGuestPlayersWithCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black" style={{ color: "var(--foreground)" }}>
          Gasten 👤
        </h1>
        <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
          Tijdelijke spelers voor een avondje
        </p>
      </div>
      <GuestsClient guests={guests} />
    </div>
  );
}

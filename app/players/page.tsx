import { PlayersClient } from "@/components/players/players-client";

export const metadata = {
  title: "Spelers beheren",
};

export default function PlayersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Spelers beheren 👥</h1>
        <p
          className="text-sm mt-1 font-semibold"
          style={{ color: "var(--muted-foreground)" }}
        >
          Wie doet er mee, wie staat standaard aangevinkt bij een nieuw potje, en welke
          gasten hebben meegespeeld.
        </p>
      </div>
      <PlayersClient />
    </div>
  );
}

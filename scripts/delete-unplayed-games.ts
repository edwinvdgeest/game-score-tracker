/**
 * Verwijder alle spellen uit de database die 0 game_sessions hebben.
 * Dit zijn seed-games die nooit gespeeld zijn.
 *
 * Gebruik: npx tsx scripts/delete-unplayed-games.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Zorg dat .env.local aanwezig is met NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function deleteUnplayedGames() {
  console.log("🔍 Zoeken naar ongespeelde spellen...\n");

  // Haal alle spellen op
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id, name, emoji");

  if (gamesError) {
    console.error("❌ Fout bij ophalen spellen:", gamesError.message);
    process.exit(1);
  }

  if (!games || games.length === 0) {
    console.log("Geen spellen gevonden.");
    return;
  }

  // Haal alle game_ids op die minstens één sessie hebben
  const { data: sessions, error: sessionsError } = await supabase
    .from("game_sessions")
    .select("game_id");

  if (sessionsError) {
    console.error("❌ Fout bij ophalen sessies:", sessionsError.message);
    process.exit(1);
  }

  const playedGameIds = new Set((sessions ?? []).map((s) => s.game_id as string));

  // Filter spellen zonder sessies
  const unplayedGames = games.filter((g) => !playedGameIds.has(g.id as string));

  if (unplayedGames.length === 0) {
    console.log("✅ Geen ongespeelde spellen gevonden. Alles is al schoon!");
    return;
  }

  console.log(`🗑️  ${unplayedGames.length} ongespeelde spellen gevonden:\n`);
  for (const game of unplayedGames) {
    console.log(`   ${game.emoji} ${game.name}`);
  }

  console.log("\n⏳ Verwijderen...");

  const ids = unplayedGames.map((g) => g.id as string);
  const { error: deleteError } = await supabase
    .from("games")
    .delete()
    .in("id", ids);

  if (deleteError) {
    console.error("❌ Fout bij verwijderen:", deleteError.message);
    process.exit(1);
  }

  console.log(`\n✅ ${unplayedGames.length} spellen verwijderd!`);
}

deleteUnplayedGames().catch(console.error);

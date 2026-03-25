/**
 * Cleanup script: removes the "Gelijkspel" fake player and nulls out winner_id
 * on sessions where Gelijkspel was the winner.
 *
 * PREREQUISITES:
 *   1. Run this SQL in Supabase Studio first (Dashboard → SQL Editor):
 *      ALTER TABLE game_sessions ALTER COLUMN winner_id DROP NOT NULL;
 *
 *   2. Then run this script from the project root:
 *      npx tsx scripts/fix-gelijkspel.ts
 */
import * as dotenv from "dotenv";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local from project root (or worktree parent)
const envPaths = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), "../../.env.local"),
];
for (const p of envPaths) {
  const result = dotenv.config({ path: p });
  if (!result.error) {
    console.log(`Loaded env from: ${p}`);
    break;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run this script from the project root directory."
  );
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  // Find the Gelijkspel player
  const { data: gelijkspel, error: findError } = await supabase
    .from("players")
    .select("id, name")
    .eq("name", "Gelijkspel")
    .maybeSingle();

  if (findError) {
    console.error("Error finding Gelijkspel player:", findError.message);
    process.exit(1);
  }

  if (!gelijkspel) {
    console.log("✅ No 'Gelijkspel' player found — nothing to clean up.");
    return;
  }

  console.log(`Found Gelijkspel player: ${gelijkspel.id}`);

  // Null out sessions where Gelijkspel was the winner
  const { error: updateError, count: sessionCount } = await supabase
    .from("game_sessions")
    .update({ winner_id: null })
    .eq("winner_id", gelijkspel.id);

  if (updateError) {
    console.error(
      "Error updating sessions:",
      updateError.message,
      "\n⚠️  Did you run the ALTER TABLE in Supabase Studio first?"
    );
    process.exit(1);
  }
  console.log(`✅ Nulled winner_id on ${sessionCount ?? "?"} sessions`);

  // Delete session_players records for Gelijkspel
  const { error: spError } = await supabase
    .from("session_players")
    .delete()
    .eq("player_id", gelijkspel.id);

  if (spError) {
    console.error("Error deleting session_players:", spError.message);
    process.exit(1);
  }
  console.log("✅ Deleted session_players records for Gelijkspel");

  // Delete the player
  const { error: deleteError } = await supabase
    .from("players")
    .delete()
    .eq("id", gelijkspel.id);

  if (deleteError) {
    console.error("Error deleting player:", deleteError.message);
    process.exit(1);
  }

  console.log("✅ Deleted Gelijkspel player. Cleanup complete!");
}

main().catch((err: unknown) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

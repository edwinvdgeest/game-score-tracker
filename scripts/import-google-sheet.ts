/**
 * CSV import script for Google Sheet migration.
 *
 * Usage: npx tsx scripts/import-google-sheet.ts <path-to-csv>
 *
 * Expected CSV columns:
 * Datum, Game, Winnaar, Beginner, Score Edwin, Score Lisanne, Weekdag
 */

import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const envResult = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
  SUPABASE_SERVICE_ROLE_KEY: process.env["SUPABASE_SERVICE_ROLE_KEY"],
});

if (!envResult.success) {
  console.error("❌ Ontbrekende environment variables:");
  console.error(envResult.error.flatten().fieldErrors);
  console.error(
    "\nZorg dat .env.local bestaat met NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const env = envResult.data;

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// CSV row schema — all columns are strings from CSV
const csvRowSchema = z.object({
  Datum: z.string(),
  Game: z.string(),
  Winnaar: z.string(),
  Beginner: z.string().optional().default(""),
  "Score Edwin": z.string().optional().default(""),
  "Score Lisanne": z.string().optional().default(""),
  Weekdag: z.string().optional().default(""),
});
type CsvRow = z.infer<typeof csvRowSchema>;

function parseDutchDate(dateStr: string): Date {
  // Try ISO first (YYYY-MM-DD)
  const iso = new Date(dateStr);
  if (!isNaN(iso.getTime())) return iso;

  // Try DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
  const match = dateStr.match(/^(\d{1,2})[/\-.\ ](\d{1,2})[/\-.\ ](\d{4})$/);
  if (match?.[1] && match?.[2] && match?.[3]) {
    return new Date(`${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`);
  }

  throw new Error(`Kan datum niet parsen: ${dateStr}`);
}

async function run() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error(
      "Gebruik: npx tsx scripts/import-google-sheet.ts <pad-naar-csv>"
    );
    process.exit(1);
  }

  const absolutePath = path.resolve(csvPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Bestand niet gevonden: ${absolutePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  const rawRows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as unknown[];

  console.log(`📂 ${rawRows.length} rijen geladen uit CSV`);

  // Fetch existing data from DB
  const [playersRes, gamesRes, existingSessionsRes] = await Promise.all([
    supabase.from("players").select("*"),
    supabase.from("games").select("*"),
    supabase.from("game_sessions").select("played_at, game_id"),
  ]);

  const players = (playersRes.data ?? []) as Array<{
    id: string;
    name: string;
  }>;
  const games = (gamesRes.data ?? []) as Array<{ id: string; name: string }>;
  const existingSessions = (existingSessionsRes.data ?? []) as Array<{
    played_at: string;
    game_id: string;
  }>;

  const playerMap = new Map(
    players.map((p) => [p.name.toLowerCase(), p])
  );
  const gameMap = new Map(
    games.map((g) => [g.name.toLowerCase(), g])
  );

  // Track existing (date, game_id) combos to skip duplicates
  const existingKeys = new Set(
    existingSessions.map(
      (s) => `${s.played_at.slice(0, 10)}_${s.game_id}`
    )
  );

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const rawRow of rawRows) {
    // Parse and validate row
    const rowResult = csvRowSchema.safeParse(rawRow);
    if (!rowResult.success) {
      console.error("⚠️  Ongeldige rij:", rawRow);
      errors++;
      continue;
    }
    const row: CsvRow = rowResult.data;

    // Parse date
    let playedAt: Date;
    try {
      playedAt = parseDutchDate(row.Datum);
    } catch {
      console.error(`⚠️  Kan datum niet parsen: "${row.Datum}"`);
      errors++;
      continue;
    }

    // Find game (case-insensitive)
    const game = gameMap.get(row.Game.toLowerCase());
    if (!game) {
      console.warn(`⚠️  Spel niet gevonden: "${row.Game}" — rij overgeslagen`);
      skipped++;
      continue;
    }

    // Check for duplicate
    const key = `${playedAt.toISOString().slice(0, 10)}_${game.id}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    // Find winner (case-insensitive)
    const winner = playerMap.get(row.Winnaar.toLowerCase());
    if (!winner) {
      console.warn(
        `⚠️  Winnaar niet gevonden: "${row.Winnaar}" — rij overgeslagen`
      );
      skipped++;
      continue;
    }

    // Find optional starter
    const starter = row.Beginner
      ? playerMap.get(row.Beginner.toLowerCase())
      : undefined;

    // Insert game session
    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .insert({
        game_id: game.id,
        played_at: playedAt.toISOString(),
        day_of_week: playedAt.getDay(),
        winner_id: winner.id,
        starter_id: starter?.id ?? null,
      })
      .select("id")
      .single();

    if (sessionError) {
      console.error(
        `❌ Fout bij invoegen sessie ${row.Datum} ${row.Game}:`,
        sessionError.message
      );
      errors++;
      continue;
    }

    if (!session) {
      console.error(`❌ Geen sessie teruggegeven voor ${row.Datum} ${row.Game}`);
      errors++;
      continue;
    }

    const sessionId = (session as { id: string }).id;

    // Insert scores where available
    const scores: Array<{
      session_id: string;
      player_id: string;
      score: number;
    }> = [];

    const edwinPlayer = playerMap.get("edwin");
    const lisannePlayer = playerMap.get("lisanne");

    if (edwinPlayer && row["Score Edwin"]) {
      const score = parseInt(row["Score Edwin"], 10);
      if (!isNaN(score)) {
        scores.push({ session_id: sessionId, player_id: edwinPlayer.id, score });
      }
    }

    if (lisannePlayer && row["Score Lisanne"]) {
      const score = parseInt(row["Score Lisanne"], 10);
      if (!isNaN(score)) {
        scores.push({
          session_id: sessionId,
          player_id: lisannePlayer.id,
          score,
        });
      }
    }

    if (scores.length > 0) {
      const { error: scoresError } = await supabase
        .from("session_players")
        .insert(scores);
      if (scoresError) {
        console.warn(
          `⚠️  Scores opslaan mislukt voor sessie ${sessionId}:`,
          scoresError.message
        );
      }
    }

    existingKeys.add(key);
    imported++;

    if (imported % 50 === 0) {
      console.log(`  ✅ ${imported} rijen geïmporteerd...`);
    }
  }

  console.log(`\n🎉 Import klaar!`);
  console.log(`   ✅ Geïmporteerd: ${imported}`);
  console.log(`   ⏭️  Overgeslagen: ${skipped}`);
  console.log(`   ❌ Fouten: ${errors}`);
}

run().catch((err: unknown) => {
  console.error("Fatale fout:", err);
  process.exit(1);
});

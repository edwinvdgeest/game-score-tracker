/**
 * Haalt voor alle spellen de BoardGameGeek-metadata op (doosfoto, jaartal,
 * speelduur, rating) en zet die in de database.
 *
 * Usage: npx tsx scripts/backfill-game-metadata.ts [opties]
 *
 * Opties:
 *   --force            Ook spellen verwerken die al eerder gesynchroniseerd zijn
 *   --only="<naam>"    Alleen spellen waarvan de naam dit bevat
 *   --limit=N          Stop na N spellen
 *   --dry-run          Niets wegschrijven, alleen tonen wat er zou gebeuren
 *   --no-claude        Nooit Nederlandse tekst laten genereren
 *
 * Over kosten: spellen die via migratie 011 een handgeschreven tekst hebben
 * gekregen staan op text_source = 'seed'. shouldGenerateText geeft daar false
 * voor terug, dus dit script besteedt geen Claude-budget aan die spellen —
 * alleen aan zelf toegevoegde spellen zonder tekst, en alleen als
 * ANTHROPIC_API_KEY gezet is.
 *
 * Over snelheid: BGG rate-limit is streng, dus alles gaat strikt sequentieel met
 * een pauze na elke HTTP-call. Reken op ongeveer twee minuten voor een volle lijst.
 * Varianten erven het BGG-id van hun hoofdspel en kosten dus geen zoekopdracht.
 */

import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import * as dotenv from "dotenv";

import { fetchBggSearch, fetchBggThing, type BggThing } from "@/lib/bgg";
import { bggSearchTermFor, pickBestBggMatch } from "@/lib/bgg-match";
import { mapBggThingToGameMetadata, shouldGenerateText } from "@/lib/game-metadata";
import type { Game, GameMetadataPatch } from "@/lib/schemas";

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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// BGG is streng; na élke HTTP-call even wachten, niet per spel.
const BGG_THROTTLE_MS = 2500;

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const noClaude = args.includes("--no-claude");
const onlyArg = args.find((a) => a.startsWith("--only="))?.slice("--only=".length).replace(/^["']|["']$/g, "");
const limitArg = args.find((a) => a.startsWith("--limit="))?.slice("--limit=".length);
const limit = limitArg ? Number.parseInt(limitArg, 10) : null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const onWait = (ms: number, reason: "queued" | "rate-limit") => {
  const label = reason === "queued" ? "staat in de wachtrij" : "rate-limit";
  console.log(`   ⏳ BGG ${label}, ${Math.round(ms / 1000)}s wachten…`);
};

async function run() {
  console.log("🎲 Metadata ophalen bij BoardGameGeek\n");
  if (dryRun) console.log("🧪 Dry-run: er wordt niets weggeschreven.\n");

  const { data, error } = await supabase
    .from("games")
    .select("*")
    // Hoofdspellen eerst: een variant erft het bgg_id van zijn hoofdspel, dus dat
    // moet al bekend zijn wanneer de variant aan de beurt komt.
    .order("parent_game_id", { ascending: true, nullsFirst: true })
    .order("name");

  if (error) {
    console.error(`❌ Ophalen van spellen mislukt: ${error.message}`);
    process.exit(1);
  }

  let games = (data ?? []) as Game[];
  if (!force) games = games.filter((g) => !g.bgg_synced_at);
  if (onlyArg) {
    const needle = onlyArg.toLowerCase();
    games = games.filter((g) => g.name.toLowerCase().includes(needle));
  }
  if (limit && limit > 0) games = games.slice(0, limit);

  if (games.length === 0) {
    console.log("✅ Niets te doen — alle spellen zijn al bijgewerkt.");
    console.log("   Gebruik --force om ze opnieuw op te halen.");
    return;
  }

  console.log(`📋 ${games.length} spellen te verwerken\n`);

  // Binnen deze run bijhouden welk hoofdspel welk bgg_id kreeg, zodat varianten
  // dat meteen kunnen overnemen zonder extra zoekopdracht.
  const bggIdByGameId = new Map<string, number>();
  for (const game of games) {
    if (game.bgg_id) bggIdByGameId.set(game.id, game.bgg_id);
  }

  let enriched = 0;
  let viaClaude = 0;
  let noMatch = 0;
  let failed = 0;
  const noMatchNames: string[] = [];

  for (const game of games) {
    console.log(`▶️  ${game.name}`);

    let thing: BggThing | null = null;
    let syncError: string | null = null;

    try {
      const inheritedId = game.parent_game_id ? bggIdByGameId.get(game.parent_game_id) : undefined;
      let bggId: number | null = null;

      if (!force && game.bgg_id) {
        bggId = game.bgg_id;
      } else if (inheritedId) {
        bggId = inheritedId;
        console.log(`   ↳ neemt BGG-id ${bggId} over van het hoofdspel`);
      } else {
        const term = bggSearchTermFor(game.name);
        if (term !== game.name) console.log(`   ↳ zoekt op "${term}"`);
        const hits = await fetchBggSearch(term, { onWait });
        await sleep(BGG_THROTTLE_MS);
        const match = pickBestBggMatch(term, hits);
        bggId = match?.hit.id ?? null;
        if (match?.ambiguous) {
          console.log(`   ⚠️  twijfelachtige match: ${match.hit.name} (${match.hit.id})`);
        }
      }

      if (bggId !== null) {
        thing = await fetchBggThing(bggId, { onWait });
        await sleep(BGG_THROTTLE_MS);
        if (!thing) syncError = `BGG kent geen spel met id ${bggId}`;
      } else {
        syncError = "Geen BGG-match gevonden";
      }
    } catch (err) {
      syncError = err instanceof Error ? err.message : "Onbekende fout bij BGG";
    }

    const patch: GameMetadataPatch = {
      bgg_synced_at: new Date().toISOString(),
      bgg_sync_error: syncError,
    };

    if (thing) {
      const mapped = mapBggThingToGameMetadata(thing);
      for (const [key, value] of Object.entries(mapped) as [keyof GameMetadataPatch, unknown][]) {
        if (key === "bgg_sync_error") continue;
        if (!force && game[key as keyof Game] != null) continue;
        Object.assign(patch, { [key]: value });
      }
      bggIdByGameId.set(game.id, thing.id);
    }

    if (!noClaude && shouldGenerateText(game)) {
      const { generateDutchGameText, isClaudeEnabled } = await import("@/lib/claude");
      if (isClaudeEnabled()) {
        const text = await generateDutchGameText({
          name: game.name,
          category: game.category,
          minPlayers: game.min_players,
          maxPlayers: game.max_players,
          bggName: thing?.name ?? null,
          yearPublished: thing?.yearPublished ?? null,
          playingTimeMinutes: thing?.playingTimeMinutes ?? null,
        });
        if (text) {
          patch.description = text.description;
          patch.rules_summary = text.rules_summary;
          patch.text_source = "claude";
          viaClaude++;
          console.log("   🤖 Nederlandse tekst gegenereerd");
        }
      }
    }

    if (dryRun) {
      console.log(`   🧪 zou wegschrijven: ${JSON.stringify(patch)}`);
    } else {
      const { error: updateError } = await supabase.from("games").update(patch).eq("id", game.id);
      if (updateError) {
        failed++;
        console.log(`   ❌ opslaan mislukt: ${updateError.message}`);
        continue;
      }
    }

    if (thing) {
      enriched++;
      console.log(`   ✅ ${thing.name} (${thing.id})`);
    } else {
      noMatch++;
      noMatchNames.push(game.name);
      console.log(`   ❓ ${syncError}`);
    }
  }

  console.log("\n🎉 Backfill klaar!");
  console.log(`   ✅ Verrijkt:         ${enriched}`);
  console.log(`   🤖 Tekst via Claude: ${viaClaude}`);
  console.log(`   ❓ Geen BGG-match:   ${noMatch}`);
  console.log(`   ❌ Fouten:           ${failed}`);

  if (noMatchNames.length > 0) {
    console.log("\n   Zonder match:");
    for (const name of noMatchNames) console.log(`     • ${name}`);
    console.log(
      "\n   Voeg deze toe aan BGG_NAME_ALIASES of BGG_ID_OVERRIDES in lib/bgg-match.ts,"
    );
    console.log("   of koppel ze in de app via 'Verkeerd spel?' op de spelpagina.");
  }
}

run().catch((err) => {
  console.error("❌ Onverwachte fout:", err);
  process.exit(1);
});

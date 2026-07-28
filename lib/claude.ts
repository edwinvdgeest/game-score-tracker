/**
 * Optionele Claude-laag: schrijft een Nederlandse omschrijving en speluitleg voor
 * spellen die er nog geen hebben.
 *
 * Dit is bewust optioneel. Zonder ANTHROPIC_API_KEY doet generateDutchGameText()
 * niets en geeft null terug — geen fout, geen log-spam. De SDK wordt dan ook niet
 * geladen (dynamische import achter de env-check), zodat een build zonder sleutel
 * niets extra's meesleept.
 */

import { z } from "zod";
import type { GameCategory } from "@/lib/schemas";

export function isClaudeEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface DutchGameTextInput {
  name: string;
  category: GameCategory;
  minPlayers: number;
  maxPlayers: number;
  bggName?: string | null;
  yearPublished?: number | null;
  playingTimeMinutes?: number | null;
}

export interface DutchGameText {
  description: string;
  rules_summary: string;
}

const dutchGameTextSchema = z.object({
  known: z
    .boolean()
    .describe("False als je dit spel niet kent. Verzin in dat geval geen regels."),
  description: z
    .string()
    .describe("2 tot 3 zinnen: waar gaat het spel over en voor wie is het leuk. Leeg als known false is."),
  rules_summary: z
    .string()
    .describe(
      "Korte speluitleg in platte tekst met de alinea's Doel, Verloop, Winnen en Tip. Leeg als known false is."
    ),
});

const SYSTEM_PROMPT = `Je schrijft korte, heldere Nederlandse teksten over gezelschapsspellen voor een privé-scoretracker van een gezin.

Stijl: informeel maar niet kinderachtig, actieve zinnen, geen marketingtaal, geen uitroeptekens.

Belangrijk: als je een spel niet met zekerheid kent, zet je "known" op false en laat je beide tekstvelden leeg. Verzin nooit spelregels. Een ontbrekende uitleg is beter dan een verkeerde.

Formaat van rules_summary: platte tekst, geen markdown en geen opsommingstekens. Vier alinea's, elk beginnend met het kopje gevolgd door een dubbele punt:
Doel: ...
Verloop: ...
Winnen: ...
Tip: ...`;

function buildPrompt(input: DutchGameTextInput): string {
  const facts: string[] = [
    `Naam in de app: ${input.name}`,
    `Categorie: ${input.category}`,
    `Aantal spelers: ${input.minPlayers} tot ${input.maxPlayers}`,
  ];
  if (input.bggName && input.bggName !== input.name) {
    facts.push(`Naam op BoardGameGeek: ${input.bggName}`);
  }
  if (input.yearPublished) facts.push(`Verschenen in: ${input.yearPublished}`);
  if (input.playingTimeMinutes) facts.push(`Speelduur: ongeveer ${input.playingTimeMinutes} minuten`);

  return `Schrijf een omschrijving en een speluitleg voor dit spel.

${facts.join("\n")}

Houd de omschrijving onder de 450 tekens en de speluitleg onder de 1200 tekens.`;
}

/**
 * Geeft null terug bij: geen sleutel, een weigering, een parse-fout of welke
 * SDK-fout dan ook. De aanroeper hoeft dus niets af te vangen.
 */
export async function generateDutchGameText(
  input: DutchGameTextInput
): Promise<DutchGameText | null> {
  if (!isClaudeEnabled()) return null;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");

    const client = new Anthropic();

    const response = await client.messages.parse({
      model: "claude-opus-5",
      // Dekt denken én uitvoer samen, dus niet ruimer dan nodig.
      max_tokens: 4096,
      output_config: {
        effort: "low",
        format: zodOutputFormat(dutchGameTextSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(input) }],
    });

    // Altijd eerst stop_reason: bij een weigering staat er geen bruikbare inhoud.
    if (response.stop_reason === "refusal") return null;

    const parsed = response.parsed_output;
    if (!parsed || !parsed.known) return null;

    const description = parsed.description.trim();
    const rulesSummary = parsed.rules_summary.trim();
    if (description.length === 0 || rulesSummary.length === 0) return null;

    return { description, rules_summary: rulesSummary };
  } catch {
    // Bewust stil: het verrijken mag nooit stuklopen op de tekstgeneratie.
    return null;
  }
}

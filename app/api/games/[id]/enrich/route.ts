import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enrichGame } from "@/lib/game-metadata";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
// BGG plus eventueel Claude duurt 5-20 seconden; de standaardlimiet is te krap.
export const maxDuration = 60;

const enrichBodySchema = z.object({
  bggId: z.number().int().positive().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Noodrem: is ENRICH_TOKEN gezet, dan is deze route alleen nog voor scripts.
    const requiredToken = process.env.ENRICH_TOKEN;
    if (requiredToken && request.headers.get("x-enrich-token") !== requiredToken) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }

    const limit = checkRateLimit("enrich", { limit: 10, windowMs: 10 * 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Te veel verzoeken. Probeer het straks opnieuw." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    // Een lege body is normaal (de knop stuurt niets mee).
    let bggId: number | undefined;
    const raw = await request.text();
    if (raw.trim().length > 0) {
      const parsed = enrichBodySchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Ongeldige invoer", details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      bggId = parsed.data.bggId;
    }

    const result = await enrichGame(id, bggId !== undefined ? { bggId } : {});

    if (result.status === "not_found") {
      return NextResponse.json({ error: "Spel niet gevonden" }, { status: 404 });
    }

    if (result.status === "cooldown") {
      const minutes = Math.max(1, Math.ceil(result.retryAfterMs / 60_000));
      return NextResponse.json(
        { error: `Metadata is net ververst. Probeer het over ${minutes} minuten opnieuw.` },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) },
        }
      );
    }

    // no_match is bewust 200: het spel bestaat, BGG heeft alleen niets bruikbaars.
    // De UI opent dan de handmatige kiezer.
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

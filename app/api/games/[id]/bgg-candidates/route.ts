import { NextRequest, NextResponse } from "next/server";
import { fetchBggSearch } from "@/lib/bgg";
import { bggSearchTermFor, rankBggCandidates } from "@/lib/bgg-match";
import { getGameById } from "@/lib/queries";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Kandidaten voor de "verkeerd spel?"-kiezer.
 *
 * Bij deze spellenlijst is dit geen randgeval maar een hoofdpad: veel titels zijn
 * Nederlands terwijl BGG Engelstalig is, dus automatisch matchen lukt lang niet
 * altijd.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const limit = checkRateLimit("bgg-candidates", { limit: 30, windowMs: 10 * 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Te veel verzoeken. Probeer het straks opnieuw." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
      );
    }

    const game = await getGameById(id);
    if (!game) {
      return NextResponse.json({ error: "Spel niet gevonden" }, { status: 404 });
    }

    const query = request.nextUrl.searchParams.get("q")?.trim() || bggSearchTermFor(game.name);
    const hits = await fetchBggSearch(query);
    const candidates = rankBggCandidates(query, hits).map((match) => ({
      bggId: match.hit.id,
      name: match.hit.name,
      yearPublished: match.hit.yearPublished,
      score: Math.round(match.score * 100) / 100,
    }));

    return NextResponse.json({ query, candidates });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

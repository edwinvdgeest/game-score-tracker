import { NextResponse } from "next/server";
import {
  getSeasonHistory,
  getSeasonList,
  getSeasonStandings,
} from "@/lib/queries";
import { seasonRefSchema } from "@/lib/schemas";
import { ZodError } from "zod";

/**
 * Eén route voor alle seizoensvragen in plaats van een [year]/[quarter]-segment: minder
 * bestanden, geen string-naar-getal-coercion van route-params, en de service worker cachet
 * op de volledige URL dus het gedrag is hetzelfde.
 *
 *   GET /api/seasons                  → de stand van het huidige seizoen
 *   GET /api/seasons?year=2026&quarter=2 → de stand van een specifiek seizoen
 *   GET /api/seasons?list=1           → alle seizoenen waarin gespeeld is
 *   GET /api/seasons?history=1        → de stand van elk seizoen (de trofeeënkast)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("list") === "1") {
      return NextResponse.json(await getSeasonList());
    }

    if (searchParams.get("history") === "1") {
      return NextResponse.json(await getSeasonHistory());
    }

    const yearParam = searchParams.get("year");
    const quarterParam = searchParams.get("quarter");

    if (yearParam === null && quarterParam === null) {
      return NextResponse.json(await getSeasonStandings());
    }

    const ref = seasonRefSchema.parse({
      year: Number(yearParam),
      quarter: Number(quarterParam),
    });
    return NextResponse.json(await getSeasonStandings(ref));
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

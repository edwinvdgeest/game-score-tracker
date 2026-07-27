import { NextResponse } from "next/server";
import { getHeadToHead } from "@/lib/queries";
import { periodFilterSchema } from "@/lib/schemas";
import { z, ZodError } from "zod";

const querySchema = z.object({
  a: z.string().uuid(),
  b: z.string().uuid(),
  period: periodFilterSchema.optional().default("all"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { a, b, period } = querySchema.parse({
      a: searchParams.get("a") ?? undefined,
      b: searchParams.get("b") ?? undefined,
      period: searchParams.get("period") ?? undefined,
    });

    if (a === b) {
      return NextResponse.json(
        { error: "Kies twee verschillende spelers" },
        { status: 400 }
      );
    }

    const result = await getHeadToHead(a, b, period);
    if (!result) {
      return NextResponse.json({ error: "Speler niet gevonden" }, { status: 404 });
    }
    return NextResponse.json(result);
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

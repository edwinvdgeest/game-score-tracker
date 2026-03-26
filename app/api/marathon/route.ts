import { NextResponse } from "next/server";
import { createMarathon, getActiveMarathon, getMarathonHistory } from "@/lib/queries";
import { createMarathonSchema } from "@/lib/schemas";
import { ZodError } from "zod";

/** GET /api/marathon — actieve marathon of null */
export async function GET() {
  try {
    const marathon = await getActiveMarathon();
    return NextResponse.json(marathon);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** POST /api/marathon — start nieuwe marathon */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = createMarathonSchema.parse(body);
    const marathon = await createMarathon(input);
    return NextResponse.json(marathon, { status: 201 });
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

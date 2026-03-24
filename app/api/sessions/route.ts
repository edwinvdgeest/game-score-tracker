import { NextResponse } from "next/server";
import { createSession } from "@/lib/queries";
import { createSessionSchema } from "@/lib/schemas";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const input = createSessionSchema.parse(body);
    await createSession(input);
    return NextResponse.json({ success: true }, { status: 201 });
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

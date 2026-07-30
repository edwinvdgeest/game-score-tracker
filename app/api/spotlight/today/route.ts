import { NextResponse } from "next/server";
import { getMemoryToday } from "@/lib/queries";

/**
 * GET /api/spotlight/today — is er een terugblik van precies vandaag?
 *
 * Voedt de stip bij het 🎮-tabblad. Een eigen route en geen fetch in app/layout.tsx: gaat
 * Supabase even plat, dan kost dat alleen de stip en niet elke pagina van de app.
 */
export async function GET() {
  try {
    const memory = await getMemoryToday();
    return NextResponse.json(memory);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}

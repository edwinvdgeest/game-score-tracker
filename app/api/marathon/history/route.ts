import { NextResponse } from "next/server";
import { getMarathonHistory } from "@/lib/queries";

/** GET /api/marathon/history — alle afgelopen marathons */
export async function GET() {
  try {
    const history = await getMarathonHistory();
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

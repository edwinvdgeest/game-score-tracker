import { NextResponse } from "next/server";
import { getActivityCalendar } from "@/lib/queries";

export async function GET() {
  try {
    const data = await getActivityCalendar();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

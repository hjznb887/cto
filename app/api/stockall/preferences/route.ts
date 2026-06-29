// StockAll API — User Preferences
// GET  /api/stockall/preferences — get preferences
// PUT  /api/stockall/preferences — update preferences (partial merge)
import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/stockall/persistence";

export async function GET() {
  try {
    const store = getStore();
    const prefs = store.getPreferences();
    return NextResponse.json({ data: prefs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const store = getStore();
    const updated = store.updatePreferences(body);
    return NextResponse.json({ data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update preferences";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
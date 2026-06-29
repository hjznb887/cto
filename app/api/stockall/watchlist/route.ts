// StockAll API — Watchlist CRUD
// GET    /api/stockall/watchlist    — list all watchlist items
// POST   /api/stockall/watchlist    — add item { symbol, name, exchange }
// DELETE /api/stockall/watchlist?id=xxx — remove item by id
import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/stockall/persistence";
import type { ExchangeCode } from "@/lib/stockall/types";

export async function GET() {
  try {
    const store = getStore();
    const items = store.getWatchlist();
    return NextResponse.json({ data: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get watchlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, name, exchange } = body;

    if (!symbol || !name) {
      return NextResponse.json(
        { error: "Missing required fields: symbol, name" },
        { status: 400 },
      );
    }

    const store = getStore();
    const item = store.addToWatchlist({
      symbol: symbol.toUpperCase(),
      name,
      exchange: (exchange || "US") as ExchangeCode,
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add to watchlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing required parameter: id" },
      { status: 400 },
    );
  }

  try {
    const store = getStore();
    const removed = store.removeFromWatchlist(id);
    if (!removed) {
      return NextResponse.json(
        { error: "Watchlist item not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove from watchlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
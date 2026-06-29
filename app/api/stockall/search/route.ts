// StockAll API — GET /api/stockall/search?q=apple
import { NextRequest, NextResponse } from "next/server";
import { getStockService } from "@/lib/stockall/stock-service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 1) {
    return NextResponse.json(
      { error: "Missing required parameter: q (search query)" },
      { status: 400 },
    );
  }

  try {
    const service = getStockService();
    const results = await service.search(query.trim());
    return NextResponse.json({ data: results, query: query.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
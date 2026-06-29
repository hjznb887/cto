// StockAll API — GET /api/stockall/quote?symbol=AAPL&exchange=US
import { NextRequest, NextResponse } from "next/server";
import { getStockService } from "@/lib/stockall/stock-service";
import type { ExchangeCode } from "@/lib/stockall/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const exchange = (searchParams.get("exchange") || "US") as ExchangeCode;

  if (!symbol) {
    return NextResponse.json(
      { error: "Missing required parameter: symbol" },
      { status: 400 },
    );
  }

  try {
    const service = getStockService();
    const quote = await service.fetchQuote(symbol.toUpperCase(), exchange);
    return NextResponse.json({ data: quote });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch quote";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
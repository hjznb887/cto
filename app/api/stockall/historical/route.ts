// StockAll API — GET /api/stockall/historical?symbol=AAPL&timeframe=1M&exchange=US
import { NextRequest, NextResponse } from "next/server";
import { getStockService } from "@/lib/stockall/stock-service";
import type { ExchangeCode, Timeframe } from "@/lib/stockall/types";

const VALID_TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "1Y", "5Y"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const timeframe = (searchParams.get("timeframe") || "1M") as Timeframe;
  const exchange = (searchParams.get("exchange") || "US") as ExchangeCode;

  if (!symbol) {
    return NextResponse.json(
      { error: "Missing required parameter: symbol" },
      { status: 400 },
    );
  }

  if (!VALID_TIMEFRAMES.includes(timeframe)) {
    return NextResponse.json(
      { error: `Invalid timeframe. Must be one of: ${VALID_TIMEFRAMES.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const service = getStockService();
    const data = await service.fetchHistorical(symbol.toUpperCase(), timeframe, exchange);
    return NextResponse.json({ data, timeframe, symbol: symbol.toUpperCase() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch historical data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
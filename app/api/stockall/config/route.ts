// StockAll API — Configuration
// GET  /api/stockall/config — get current service config (api key status, cache info)
// PUT  /api/stockall/config — update API key
import { NextRequest, NextResponse } from "next/server";
import { getStockService } from "@/lib/stockall/stock-service";

export async function GET() {
  const service = getStockService();
  return NextResponse.json({
    data: {
      hasApiKey: service.hasApiKey(),
      canMakeAPICall: service.canMakeAPICall(),
      msUntilNextCall: service.msUntilNextCall(),
    },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (apiKey !== undefined && typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "apiKey must be a string" },
        { status: 400 },
      );
    }

    const service = getStockService();
    if (apiKey) {
      service.setApiKey(apiKey);
    }
    service.clearCache();

    return NextResponse.json({
      data: {
        hasApiKey: service.hasApiKey(),
        message: apiKey ? "API key updated and cache cleared" : "API key removed and cache cleared",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
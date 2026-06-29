// StockAll API — Alerts CRUD
// GET    /api/stockall/alerts — list all alerts (optional ?symbol=AAPL)
// POST   /api/stockall/alerts — create alert { symbol, conditionType, threshold, label?, enabled? }
// PATCH  /api/stockall/alerts — update alert { id, ...fields }
// DELETE /api/stockall/alerts?id=xxx — delete alert
import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/stockall/persistence";
import type { AlertConditionType } from "@/lib/stockall/types";

const VALID_CONDITIONS: AlertConditionType[] = [
  "GREATER_THAN",
  "LESS_THAN",
  "CROSSES_ABOVE",
  "CROSSES_BELOW",
  "PERCENT_CHANGE",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const store = getStore();
    const alerts = symbol
      ? store.getAlertsForSymbol(symbol.toUpperCase())
      : store.getAlerts();
    return NextResponse.json({ data: alerts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get alerts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, conditionType, threshold, label, enabled } = body;

    if (!symbol || !conditionType || threshold === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: symbol, conditionType, threshold" },
        { status: 400 },
      );
    }

    if (!VALID_CONDITIONS.includes(conditionType)) {
      return NextResponse.json(
        { error: `Invalid conditionType. Must be one of: ${VALID_CONDITIONS.join(", ")}` },
        { status: 400 },
      );
    }

    if (typeof threshold !== "number" || isNaN(threshold)) {
      return NextResponse.json(
        { error: "threshold must be a valid number" },
        { status: 400 },
      );
    }

    const store = getStore();
    const alert = store.createAlert({
      symbol: symbol.toUpperCase(),
      conditionType,
      threshold,
      label: label || undefined,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
    });
    return NextResponse.json({ data: alert }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create alert";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 },
      );
    }

    const store = getStore();
    const updated = store.updateAlert(id, updates);
    if (!updated) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update alert";
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
    const deleted = store.deleteAlert(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete alert";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
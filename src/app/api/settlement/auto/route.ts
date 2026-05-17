import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrice } from "@/services/price";
import { settleSignal } from "@/services/settlement";
import { syncSettleSignal } from "@/services/arc/sync";

// GET: Auto-settlement endpoint called by the client-side poller.
// Checks all OPEN/ACTIVE signals against live prices and settles any that hit TP/SL/expiry.
export async function GET() {
  const activeSignals = await prisma.signal.findMany({
    where: { status: { in: ["OPEN", "ACTIVE"] } },
  });

  if (activeSignals.length === 0) {
    return NextResponse.json({ settled: 0, results: [] });
  }

  const results = [];

  for (const signal of activeSignals) {
    try {
      const currentPrice = await getPrice(signal.market);
      const result = await settleSignal(signal.id, currentPrice);
      if (result) {
        await syncSettleSignal(signal.id, result.result as "SUCCESS" | "FAILED" | "EXPIRED");
        results.push({
          signalId: signal.id,
          market: signal.market,
          direction: signal.direction,
          result: result.result,
          slashAmount: result.slashAmount,
        });
      }
    } catch {
      // skip individual errors silently
    }
  }

  return NextResponse.json({ settled: results.length, results });
}

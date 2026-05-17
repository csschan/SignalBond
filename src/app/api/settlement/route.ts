import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrice } from "@/services/price";
import { settleSignal } from "@/services/settlement";
import { syncSettleSignal } from "@/services/arc/sync";

// POST: Check and settle all active signals
export async function POST() {
  const activeSignals = await prisma.signal.findMany({
    where: { status: { in: ["OPEN", "ACTIVE"] } },
  });

  if (activeSignals.length === 0) {
    return NextResponse.json({ message: "No active signals to settle", results: [] });
  }

  const results = [];

  for (const signal of activeSignals) {
    try {
      const currentPrice = await getPrice(signal.market);
      const result = await settleSignal(signal.id, currentPrice);
      if (result) {
        // Sync settlement to Arc Chain
        const chainResult = await syncSettleSignal(signal.id, result.result as "SUCCESS" | "FAILED" | "EXPIRED");
        results.push({ signalId: signal.id, market: signal.market, ...result, chainTxHash: chainResult.txHash });
      }
    } catch (err) {
      results.push({ signalId: signal.id, error: String(err) });
    }
  }

  return NextResponse.json({ message: `Checked ${activeSignals.length} signals`, results });
}

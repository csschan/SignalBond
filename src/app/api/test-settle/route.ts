import { NextRequest, NextResponse } from "next/server";
import { settleSignal } from "@/services/settlement";
import { syncSettleSignal } from "@/services/arc/sync";

// POST: Force-settle a signal with a specific price (for testing)
export async function POST(req: NextRequest) {
  const { signalId, price } = await req.json();

  if (!signalId || !price) {
    return NextResponse.json({ error: "signalId and price required" }, { status: 400 });
  }

  try {
    const result = await settleSignal(signalId, price);
    if (result) {
      const chainResult = await syncSettleSignal(signalId, result.result as "SUCCESS" | "FAILED" | "EXPIRED");
      return NextResponse.json({ ...result, chainTxHash: chainResult.txHash });
    }
    return NextResponse.json({ message: "Signal not resolved at this price" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

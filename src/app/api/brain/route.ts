import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchBrainPositions, brainPositionToSignal } from "@/services/brain";

// GET: View current Brain positions
export async function GET() {
  const positions = await fetchBrainPositions();
  return NextResponse.json({ count: positions.length, positions });
}

// POST: Import Brain positions as SignalBond signals
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const agentId = body.agentId;

  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const positions = await fetchBrainPositions();
  if (positions.length === 0) {
    return NextResponse.json({ error: "No positions from Brain API" }, { status: 404 });
  }

  const created = [];
  const skipped = [];

  for (const pos of positions) {
    const signalData = brainPositionToSignal(pos);

    // Re-fetch agent balance (it decreases each loop)
    const latestAgent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!latestAgent || latestAgent.balance < signalData.bondAmount) {
      skipped.push({ token: pos.token, reason: "insufficient balance" });
      continue;
    }

    // Skip if we already have an open signal for this token from this agent
    const existing = await prisma.signal.findFirst({
      where: {
        agentId,
        market: signalData.market,
        status: { in: ["OPEN", "ACTIVE"] },
      },
    });
    if (existing) {
      skipped.push({ token: pos.token, reason: "signal already open" });
      continue;
    }

    const expiryTime = new Date(Date.now() + signalData.expiryMinutes * 60 * 1000);

    const signal = await prisma.signal.create({
      data: {
        agentId,
        market: signalData.market,
        direction: signalData.direction,
        entryPrice: signalData.entryPrice,
        takeProfit: signalData.takeProfit,
        stopLoss: signalData.stopLoss,
        expiryTime,
        confidence: signalData.confidence,
        bondAmount: signalData.bondAmount,
        accessFee: signalData.accessFee,
        publicSummary: signalData.publicSummary,
        privateReasoning: signalData.privateReasoning,
        status: "OPEN",
      },
    });

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        balance: { decrement: signalData.bondAmount },
        totalBondedUsdc: { increment: signalData.bondAmount },
        totalSignals: { increment: 1 },
      },
    });

    created.push({
      signalId: signal.id,
      token: pos.token,
      market: signalData.market,
      direction: signalData.direction,
      confidence: signalData.confidence,
      bondAmount: signalData.bondAmount,
    });
  }

  return NextResponse.json({
    imported: created.length,
    skipped: skipped.length,
    created,
    skipped_details: skipped,
  });
}

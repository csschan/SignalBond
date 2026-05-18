import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSignal } from "@/services/signal-engine";
import { SUPPORTED_MARKETS } from "@/lib/constants";
import { syncCreateSignal } from "@/services/arc/sync";

// GET: List all signals
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const market = searchParams.get("market");
  const status = searchParams.get("status");
  const agentId = searchParams.get("agentId");

  const where: Record<string, unknown> = {};
  if (market) where.market = market;
  if (status) where.status = status;
  if (agentId) where.agentId = agentId;

  const signals = await prisma.signal.findMany({
    where,
    include: {
      agent: { select: { id: true, name: true, reputationScore: true, successCount: true, totalSignals: true, avatarUrl: true } },
      purchases: { select: { id: true } },
      challenges: { select: { id: true, challengeAmount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Hide private data (Entry/TP/SL/reasoning) for non-purchased signals
  const publicSignals = signals.map((s) => ({
    ...s,
    entryPrice: undefined,
    takeProfit: undefined,
    stopLoss: undefined,
    privateReasoning: undefined,
    buyerCount: s.purchases.length,
    challengePool: s.challenges.reduce((sum, c) => sum + c.challengeAmount, 0),
    challengeCount: s.challenges.length,
    purchases: undefined,
    challenges: undefined,
  }));

  return NextResponse.json(publicSignals);
}

// POST: Agent creates a new signal
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { agentId, market, autoGenerate } = body;

  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let signalData;

  if (autoGenerate) {
    // Auto-generate signal using AI engine
    const m = market && SUPPORTED_MARKETS.includes(market) ? market : SUPPORTED_MARKETS[Math.floor(Math.random() * SUPPORTED_MARKETS.length)];
    signalData = await generateSignal(m);
  } else {
    // Manual signal creation
    const { direction, entryPrice, takeProfit, stopLoss, expiryMinutes, confidence, bondAmount, accessFee, publicSummary, privateReasoning } = body;
    if (!market || !direction || !entryPrice || !takeProfit || !stopLoss || !expiryMinutes || confidence == null || !bondAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    signalData = { market, direction, entryPrice, takeProfit, stopLoss, expiryMinutes, confidence, bondAmount, accessFee: accessFee || 0.2, publicSummary: publicSummary || `${market} ${direction} signal`, privateReasoning: privateReasoning || "AI-generated reasoning" };
  }

  // Check agent has enough balance for bond
  if (agent.balance < signalData.bondAmount) {
    return NextResponse.json({ error: "Insufficient agent balance for bond" }, { status: 400 });
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

  // Lock bond from agent balance
  await prisma.agent.update({
    where: { id: agentId },
    data: {
      balance: { decrement: signalData.bondAmount },
      totalBondedUsdc: { increment: signalData.bondAmount },
      totalSignals: { increment: 1 },
    },
  });

  // Create signal on-chain (agent bond locked via operator wallet)
  const chainResult = await syncCreateSignal(
    signal.id,
    null,
    signalData.bondAmount,
    signalData.accessFee
  );

  return NextResponse.json({ ...signal, chainTxHash: chainResult.txHash }, { status: 201 });
}

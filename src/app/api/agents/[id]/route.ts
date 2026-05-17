import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      signals: {
        orderBy: { createdAt: "desc" },
        include: {
          purchases: { select: { id: true } },
          challenges: { select: { id: true, challengeAmount: true } },
        },
      },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const winRate = agent.totalSignals > 0 ? (agent.successCount / agent.totalSignals) * 100 : 0;

  // Calculate confidence accuracy from actual signals
  const resolvedSignals = agent.signals.filter((s) =>
    ["SUCCESS", "FAILED", "EXPIRED", "SETTLED"].includes(s.status)
  );
  const avgConfidence = resolvedSignals.length > 0
    ? resolvedSignals.reduce((sum, s) => sum + s.confidence, 0) / resolvedSignals.length
    : 0;
  const confidenceAccuracy = resolvedSignals.length > 0
    ? Math.round((1 - Math.abs(avgConfidence - winRate) / 100) * 100)
    : 0;

  const totalBuyerCount = agent.signals.reduce((sum, s) => sum + s.purchases.length, 0);
  const totalChallengeVolume = agent.signals.reduce(
    (sum, s) => sum + s.challenges.reduce((cs, c) => cs + c.challengeAmount, 0),
    0
  );

  return NextResponse.json({
    ...agent,
    signals: agent.signals.map((s) => ({
      ...s,
      privateReasoning: undefined,
      buyerCount: s.purchases.length,
      challengePool: s.challenges.reduce((sum, c) => sum + c.challengeAmount, 0),
      purchases: undefined,
      challenges: undefined,
    })),
    winRate: Math.round(winRate * 10) / 10,
    avgConfidence: Math.round(avgConfidence),
    confidenceAccuracy,
    totalBuyerCount,
    totalChallengeVolume: Math.round(totalChallengeVolume * 100) / 100,
  });
}

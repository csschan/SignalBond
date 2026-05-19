import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [
    totalSignals,
    openSignals,
    settledSignals,
    successSignals,
    failedSignals,
    totalAgents,
    totalUsers,
    totalPurchases,
    totalChallenges,
  ] = await Promise.all([
    prisma.signal.count(),
    prisma.signal.count({ where: { status: "OPEN" } }),
    prisma.signal.count({ where: { status: "SETTLED" } }),
    prisma.signal.count({ where: { settlementResult: "SUCCESS" } }),
    prisma.signal.count({ where: { settlementResult: "FAILED" } }),
    prisma.agent.count(),
    prisma.user.count(),
    prisma.signalPurchase.count(),
    prisma.challenge.count(),
  ]);

  const agents = await prisma.agent.findMany();
  const totalBondedUsdc = agents.reduce((sum, a) => sum + a.totalBondedUsdc, 0);
  const totalSlashedUsdc = agents.reduce((sum, a) => sum + a.totalSlashedUsdc, 0);
  const totalRevenueUsdc = agents.reduce((sum, a) => sum + a.totalRevenueUsdc, 0);

  const settlements = await prisma.settlement.findMany();
  const totalBuyerCompensation = settlements.reduce((sum, s) => sum + s.buyerCompensationPool, 0);
  const totalChallengerReward = settlements.reduce((sum, s) => sum + s.challengerRewardPool, 0);
  const totalProtocolFee = settlements.reduce((sum, s) => sum + s.protocolFee, 0);

  return NextResponse.json({
    signals: { total: totalSignals, open: openSignals, settled: settledSignals, success: successSignals, failed: failedSignals },
    agents: totalAgents,
    users: totalUsers,
    purchases: totalPurchases,
    challenges: totalChallenges,
    usdc: {
      totalBonded: Math.round(totalBondedUsdc * 100) / 100,
      totalSlashed: Math.round(totalSlashedUsdc * 100) / 100,
      totalRevenue: Math.round(totalRevenueUsdc * 100) / 100,
      buyerCompensation: Math.round(totalBuyerCompensation * 100) / 100,
      challengerReward: Math.round(totalChallengerReward * 100) / 100,
      protocolFee: Math.round(totalProtocolFee * 100) / 100,
    },
  });
}

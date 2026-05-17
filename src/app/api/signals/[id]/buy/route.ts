import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, txHash } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const signal = await prisma.signal.findUnique({ where: { id } });
  if (!signal) return NextResponse.json({ error: "Signal not found" }, { status: 404 });
  if (signal.status !== "OPEN" && signal.status !== "ACTIVE") {
    return NextResponse.json({ error: "Signal not available for purchase" }, { status: 400 });
  }

  // Find or create user by wallet address or demo ID
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    // Check if it's a wallet address (0x...) → auto-create user
    if (userId.startsWith("0x")) {
      user = await prisma.user.create({
        data: {
          id: userId,
          name: `${userId.slice(0, 6)}...${userId.slice(-4)}`,
          walletAddress: userId,
          balance: 0, // balance tracked on-chain, not in DB
        },
      });
    } else {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
  }

  // Check if already purchased
  const existing = await prisma.signalPurchase.findFirst({
    where: { signalId: id, userId },
  });
  if (existing) {
    return NextResponse.json({ error: "Already purchased" }, { status: 400 });
  }

  const purchase = await prisma.signalPurchase.create({
    data: {
      signalId: id,
      userId,
      amountUsdc: signal.accessFee,
    },
  });

  // Update user stats (DB tracking only, actual USDC moved on-chain)
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalSpentUsdc: { increment: signal.accessFee },
    },
  });

  // Return signal with private reasoning
  const fullSignal = await prisma.signal.findUnique({
    where: { id },
    include: { agent: { select: { name: true, reputationScore: true } } },
  });

  return NextResponse.json({ purchase, signal: fullSignal, txHash: txHash || null }, { status: 201 });
}

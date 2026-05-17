import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, amount, txHash } = await req.json();

  if (!userId || !amount || amount <= 0) {
    return NextResponse.json({ error: "userId and positive amount required" }, { status: 400 });
  }

  const signal = await prisma.signal.findUnique({ where: { id } });
  if (!signal) return NextResponse.json({ error: "Signal not found" }, { status: 404 });
  if (signal.status !== "OPEN" && signal.status !== "ACTIVE") {
    return NextResponse.json({ error: "Signal not available for challenge" }, { status: 400 });
  }

  // Find or create user by wallet address
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    if (userId.startsWith("0x")) {
      user = await prisma.user.create({
        data: {
          id: userId,
          name: `${userId.slice(0, 6)}...${userId.slice(-4)}`,
          walletAddress: userId,
          balance: 0,
        },
      });
    } else {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
  }

  const challenge = await prisma.challenge.create({
    data: {
      signalId: id,
      userId,
      challengeAmount: amount,
    },
  });

  // Update user stats (DB tracking, actual USDC on-chain)
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalChallengeUsdc: { increment: amount },
    },
  });

  return NextResponse.json({ ...challenge, txHash: txHash || null }, { status: 201 });
}

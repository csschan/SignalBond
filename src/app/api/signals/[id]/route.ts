import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const signal = await prisma.signal.findUnique({
    where: { id },
    include: {
      agent: true,
      purchases: { include: { user: { select: { id: true, name: true } } } },
      challenges: { include: { user: { select: { id: true, name: true } } } },
      settlement: true,
    },
  });

  if (!signal) {
    return NextResponse.json({ error: "Signal not found" }, { status: 404 });
  }

  const isResolved = ["SUCCESS", "FAILED", "EXPIRED", "SETTLED"].includes(signal.status);
  const hasPurchased = userId
    ? signal.purchases.some((p) => p.userId.toLowerCase() === userId.toLowerCase())
    : false;
  const unlocked = isResolved || hasPurchased;

  return NextResponse.json({
    ...signal,
    // Only show trade details and reasoning if unlocked
    entryPrice: unlocked ? signal.entryPrice : undefined,
    takeProfit: unlocked ? signal.takeProfit : undefined,
    stopLoss: unlocked ? signal.stopLoss : undefined,
    privateReasoning: unlocked ? signal.privateReasoning : undefined,
  });
}

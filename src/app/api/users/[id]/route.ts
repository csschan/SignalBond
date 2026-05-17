import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      purchases: {
        include: {
          signal: {
            include: {
              agent: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      challenges: {
        include: {
          signal: {
            include: {
              agent: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const challengePnl = user.challenges.reduce((pnl, c) => {
    if (c.status === "WON") return pnl + c.rewardAmount;
    if (c.status === "LOST") return pnl - c.challengeAmount;
    return pnl;
  }, 0);

  return NextResponse.json({ ...user, challengePnl: Math.round(challengePnl * 100) / 100 });
}

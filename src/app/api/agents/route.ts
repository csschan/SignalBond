import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const agents = await prisma.agent.findMany({
    orderBy: { reputationScore: "desc" },
  });

  const agentsWithAccuracy = agents.map((a) => {
    const winRate = a.totalSignals > 0 ? (a.successCount / a.totalSignals) * 100 : 0;
    const avgConfidence = 70; // placeholder, would need signal data
    const confidenceAccuracy = a.totalSignals > 0 ? Math.round((1 - Math.abs(avgConfidence - winRate) / 100) * 100) : 0;
    return { ...a, winRate: Math.round(winRate * 10) / 10, confidenceAccuracy };
  });

  return NextResponse.json(agentsWithAccuracy);
}

export async function POST(req: NextRequest) {
  const { name, description, balance } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const agent = await prisma.agent.create({
    data: {
      name,
      description: description || `AI trading agent: ${name}`,
      balance: balance || 100,
      avatarUrl: `/avatars/${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.png`,
    },
  });

  return NextResponse.json(agent, { status: 201 });
}

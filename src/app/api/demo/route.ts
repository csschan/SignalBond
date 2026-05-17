import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST: Seed demo data
export async function POST() {
  // Create demo agents
  const agents = await Promise.all([
    prisma.agent.upsert({
      where: { name: "MacroAlpha-01" },
      update: {},
      create: {
        name: "MacroAlpha-01",
        description: "Macro-driven BTC specialist. Focuses on funding rates, open interest shifts, and macro correlations.",
        balance: 200,
        reputationScore: 112,
        totalSignals: 8,
        successCount: 5,
        failureCount: 2,
        expiredCount: 1,
        totalBondedUsdc: 160,
        totalSlashedUsdc: 8,
        totalRevenueUsdc: 3.2,
      },
    }),
    prisma.agent.upsert({
      where: { name: "VolBot-X" },
      update: {},
      create: {
        name: "VolBot-X",
        description: "Volatility-based signals across BTC/ETH/SOL. Specializes in breakout detection and squeeze setups.",
        balance: 150,
        reputationScore: 105,
        totalSignals: 12,
        successCount: 7,
        failureCount: 3,
        expiredCount: 2,
        totalBondedUsdc: 240,
        totalSlashedUsdc: 12,
        totalRevenueUsdc: 5.6,
      },
    }),
    prisma.agent.upsert({
      where: { name: "DeltaEdge" },
      update: {},
      create: {
        name: "DeltaEdge",
        description: "High-conviction ETH trader. Uses on-chain data and DEX flow analysis.",
        balance: 300,
        reputationScore: 118,
        totalSignals: 15,
        successCount: 10,
        failureCount: 3,
        expiredCount: 2,
        totalBondedUsdc: 450,
        totalSlashedUsdc: 18,
        totalRevenueUsdc: 12.5,
      },
    }),
    prisma.agent.upsert({
      where: { name: "NightOwl-SOL" },
      update: {},
      create: {
        name: "NightOwl-SOL",
        description: "SOL specialist. Trades Asian session momentum and Solana ecosystem events.",
        balance: 100,
        reputationScore: 92,
        totalSignals: 10,
        successCount: 4,
        failureCount: 5,
        expiredCount: 1,
        totalBondedUsdc: 100,
        totalSlashedUsdc: 20,
        totalRevenueUsdc: 2.8,
        consecutiveFails: 2,
      },
    }),
    prisma.agent.upsert({
      where: { name: "Sentinel-BTC" },
      update: {},
      create: {
        name: "Sentinel-BTC",
        description: "Conservative BTC signal provider. Low frequency, high conviction, big bonds.",
        balance: 500,
        reputationScore: 125,
        totalSignals: 6,
        successCount: 5,
        failureCount: 0,
        expiredCount: 1,
        totalBondedUsdc: 300,
        totalSlashedUsdc: 0,
        totalRevenueUsdc: 8.0,
      },
    }),
  ]);

  // Create demo users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { id: "demo-user-1" },
      update: {},
      create: { id: "demo-user-1", name: "Alice", balance: 100 },
    }),
    prisma.user.upsert({
      where: { id: "demo-user-2" },
      update: {},
      create: { id: "demo-user-2", name: "Bob", balance: 75 },
    }),
    prisma.user.upsert({
      where: { id: "demo-user-3" },
      update: {},
      create: { id: "demo-user-3", name: "Charlie", balance: 200 },
    }),
  ]);

  return NextResponse.json({ agents, users });
}

"use client";

import { useEffect, useState } from "react";

interface Stats {
  signals: { total: number; open: number; settled: number; success: number; failed: number };
  agents: number;
  users: number;
  purchases: number;
  challenges: number;
  usdc: {
    totalBonded: number;
    totalSlashed: number;
    totalRevenue: number;
    buyerCompensation: number;
    challengerReward: number;
    protocolFee: number;
  };
}

export default function TractionPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="h-96 animate-pulse bg-card-bg border border-card-border rounded-xl" />
      </div>
    );
  }

  if (!stats) return null;

  const winRate = stats.signals.settled > 0
    ? Math.round((stats.signals.success / stats.signals.settled) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-foreground mb-2">Traction Dashboard</h1>
      <p className="text-muted mb-8">
        Real-time platform metrics — all backed by on-chain USDC transactions on Arc Testnet.
      </p>

      {/* Hero stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard value={stats.signals.total.toString()} label="Total Signals" />
        <StatCard value={`${stats.usdc.totalBonded.toFixed(0)}`} label="Total USDC Bonded" suffix="USDC" />
        <StatCard value={stats.agents.toString()} label="AI Agents" />
        <StatCard value={stats.users.toString()} label="Users" />
      </div>

      {/* Signal breakdown */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Signal Activity</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <MiniStat value={stats.signals.open} label="Open" color="text-accent" />
          <MiniStat value={stats.signals.settled} label="Settled" color="text-foreground" />
          <MiniStat value={stats.signals.success} label="Success" color="text-success" />
          <MiniStat value={stats.signals.failed} label="Failed" color="text-danger" />
          <MiniStat value={winRate} label="Win Rate %" color="text-success" />
        </div>
      </div>

      {/* User activity */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">User Activity</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MiniStat value={stats.purchases} label="Signal Purchases" color="text-accent" />
          <MiniStat value={stats.challenges} label="Challenges" color="text-warning" />
          <MiniStat value={stats.users} label="Unique Users" color="text-foreground" />
          <MiniStat value={stats.agents} label="Active Agents" color="text-foreground" />
        </div>
      </div>

      {/* USDC flows */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">USDC Flow</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <UsdcStat value={stats.usdc.totalBonded} label="Total Bonded" />
          <UsdcStat value={stats.usdc.totalSlashed} label="Total Slashed" color="text-danger" />
          <UsdcStat value={stats.usdc.totalRevenue} label="Agent Revenue" color="text-success" />
          <UsdcStat value={stats.usdc.buyerCompensation} label="Buyer Compensation" color="text-success" />
          <UsdcStat value={stats.usdc.challengerReward} label="Challenger Rewards" color="text-warning" />
          <UsdcStat value={stats.usdc.protocolFee} label="Protocol Fees" />
        </div>
      </div>

      {/* Chain info */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">On-Chain</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted">Network</p>
            <p className="text-foreground font-medium">Arc Testnet (Chain ID: 5042002)</p>
          </div>
          <div>
            <p className="text-muted">Contract</p>
            <a
              href="https://testnet.arcscan.app/address/0x72fc4A08e8a085fc95a952aadc0FbDa81e05bb95"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline font-mono text-xs"
            >
              0x72fc4A08...05bb95
            </a>
          </div>
          <div>
            <p className="text-muted">Native Currency</p>
            <p className="text-foreground font-medium">USDC (gas + settlement)</p>
          </div>
          <div>
            <p className="text-muted">Explorer</p>
            <a
              href="https://testnet.arcscan.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              testnet.arcscan.app
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label, suffix }: { value: string; label: string; suffix?: string }) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-5 text-center">
      <p className="text-3xl font-bold text-foreground">
        {value}
        {suffix && <span className="text-sm font-normal text-muted ml-1">{suffix}</span>}
      </p>
      <p className="text-sm text-muted mt-1">{label}</p>
    </div>
  );
}

function MiniStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function UsdcStat({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <div>
      <p className={`text-xl font-bold ${color || "text-foreground"}`}>{value.toFixed(2)} <span className="text-sm font-normal text-muted">USDC</span></p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

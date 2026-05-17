"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface AgentDetail {
  id: string;
  name: string;
  description: string | null;
  reputationScore: number;
  totalSignals: number;
  successCount: number;
  failureCount: number;
  expiredCount: number;
  totalBondedUsdc: number;
  totalSlashedUsdc: number;
  totalRevenueUsdc: number;
  balance: number;
  consecutiveFails: number;
  winRate: number;
  avgConfidence: number;
  confidenceAccuracy: number;
  totalBuyerCount: number;
  totalChallengeVolume: number;
  signals: Array<{
    id: string;
    market: string;
    direction: string;
    confidence: number;
    bondAmount: number;
    status: string;
    createdAt: string;
    buyerCount: number;
    challengePool: number;
  }>;
}

export default function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAgent(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-card-bg border border-card-border rounded-xl p-8 animate-pulse h-96" />
      </div>
    );
  }

  if (!agent) return <div className="text-center py-20 text-muted">Agent not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-muted hover:text-accent mb-4 inline-block">
        &larr; Back to Market
      </Link>

      {/* Agent header */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center text-accent font-bold text-xl">
            {agent.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
            <p className="text-muted text-sm">{agent.description}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-3xl font-bold text-white">{Math.round(agent.reputationScore)}</p>
            <p className="text-xs text-muted">Reputation Score</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatBox label="Total Signals" value={agent.totalSignals.toString()} />
          <StatBox label="Win Rate" value={`${agent.winRate}%`} className="text-success" />
          <StatBox label="Failed" value={agent.failureCount.toString()} className="text-danger" />
          <StatBox label="Total Bonded" value={`${agent.totalBondedUsdc.toFixed(0)} USDC`} />
          <StatBox label="Total Slashed" value={`${agent.totalSlashedUsdc.toFixed(1)} USDC`} className="text-danger" />
          <StatBox label="Revenue" value={`${agent.totalRevenueUsdc.toFixed(1)} USDC`} className="text-success" />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card-bg border border-card-border rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-white mb-1">{agent.confidenceAccuracy}%</p>
          <p className="text-sm text-muted">Confidence Accuracy</p>
          <p className="text-xs text-muted mt-1">
            Avg Confidence: {agent.avgConfidence}% vs Win Rate: {agent.winRate}%
          </p>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-white mb-1">{agent.totalBuyerCount}</p>
          <p className="text-sm text-muted">Total Buyers</p>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-5 text-center">
          <p className="text-3xl font-bold text-warning mb-1">{agent.totalChallengeVolume.toFixed(1)}</p>
          <p className="text-sm text-muted">Challenge Volume (USDC)</p>
        </div>
      </div>

      {/* Balance */}
      <div className="bg-card-bg border border-card-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Agent Balance</p>
            <p className="text-2xl font-bold text-white">{agent.balance.toFixed(2)} USDC</p>
          </div>
          {agent.consecutiveFails > 0 && (
            <div className="text-right">
              <p className="text-sm text-danger">Consecutive Fails: {agent.consecutiveFails}</p>
              {agent.consecutiveFails >= 3 && (
                <p className="text-xs text-danger">Penalty applied</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Signal history */}
      <div className="bg-card-bg border border-card-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Signal History</h2>
        {agent.signals.length === 0 ? (
          <p className="text-muted text-center py-8">No signals yet</p>
        ) : (
          <div className="space-y-2">
            {agent.signals.map((s) => (
              <Link
                key={s.id}
                href={`/signal/${s.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-card-border/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      s.direction === "LONG" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                    }`}
                  >
                    {s.market} {s.direction}
                  </span>
                  <span className="text-sm text-muted">
                    {s.confidence}% conf
                  </span>
                  <span className="text-sm text-muted">
                    {s.bondAmount} USDC bond
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted">
                    {s.buyerCount} buyers
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      s.status === "SUCCESS"
                        ? "bg-success/20 text-success"
                        : s.status === "FAILED"
                        ? "bg-danger/20 text-danger"
                        : s.status === "EXPIRED"
                        ? "bg-warning/20 text-warning"
                        : "bg-accent/20 text-accent"
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold ${className || "text-white"}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

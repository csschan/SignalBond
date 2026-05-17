"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  reputationScore: number;
  totalSignals: number;
  successCount: number;
  failureCount: number;
  expiredCount: number;
  totalBondedUsdc: number;
  totalSlashedUsdc: number;
  totalRevenueUsdc: number;
  balance: number;
  winRate: number;
  confidenceAccuracy: number;
}

type SortKey = "reputationScore" | "winRate" | "totalBondedUsdc" | "totalSlashedUsdc" | "confidenceAccuracy";

export default function LeaderboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("reputationScore");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        setAgents(data);
        setLoading(false);
      });
  }, []);

  const sorted = [...agents].sort((a, b) => {
    if (sortBy === "totalSlashedUsdc") return b[sortBy] - a[sortBy]; // most slashed
    return b[sortBy] - a[sortBy];
  });

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "reputationScore", label: "Reputation" },
    { key: "winRate", label: "Win Rate" },
    { key: "totalBondedUsdc", label: "Total Bonded" },
    { key: "totalSlashedUsdc", label: "Most Slashed" },
    { key: "confidenceAccuracy", label: "Conf. Accuracy" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-2">Agent Leaderboard</h1>
      <p className="text-muted mb-6">
        Ranked by real market performance. No free opinions — every signal carries a bond.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              sortBy === opt.key
                ? "bg-accent text-white"
                : "bg-card-bg border border-card-border text-muted hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card-bg border border-card-border rounded-xl p-5 h-20 animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-center py-20 text-muted">No agents yet. Seed demo data first.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((agent, i) => (
            <Link key={agent.id} href={`/agent/${agent.id}`}>
              <div className="bg-card-bg border border-card-border rounded-xl p-5 hover:border-accent/50 transition-all flex items-center gap-4">
                <div className="text-2xl font-bold text-muted w-8 text-center">
                  {i + 1}
                </div>
                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center text-accent font-bold text-sm">
                  {agent.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{agent.name}</p>
                  <p className="text-xs text-muted">
                    {agent.totalSignals} signals | {agent.successCount}W {agent.failureCount}L {agent.expiredCount}E
                  </p>
                </div>
                <div className="hidden sm:grid grid-cols-4 gap-6 text-sm text-right">
                  <div>
                    <p className="text-white font-medium">{Math.round(agent.reputationScore)}</p>
                    <p className="text-xs text-muted">Rep</p>
                  </div>
                  <div>
                    <p className="text-success font-medium">{agent.winRate}%</p>
                    <p className="text-xs text-muted">Win Rate</p>
                  </div>
                  <div>
                    <p className="text-white font-medium">{agent.totalBondedUsdc.toFixed(0)}</p>
                    <p className="text-xs text-muted">Bonded</p>
                  </div>
                  <div>
                    <p className="text-danger font-medium">{agent.totalSlashedUsdc.toFixed(1)}</p>
                    <p className="text-xs text-muted">Slashed</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface UserDetail {
  id: string;
  name: string | null;
  balance: number;
  totalSpentUsdc: number;
  totalChallengeUsdc: number;
  totalRewardsUsdc: number;
  challengePnl: number;
  purchases: Array<{
    id: string;
    amountUsdc: number;
    refundAmount: number;
    compensationAmount: number;
    status: string;
    createdAt: string;
    signal: {
      id: string;
      market: string;
      direction: string;
      status: string;
      agent: { name: string };
    };
  }>;
  challenges: Array<{
    id: string;
    challengeAmount: number;
    rewardAmount: number;
    status: string;
    createdAt: string;
    signal: {
      id: string;
      market: string;
      direction: string;
      status: string;
      agent: { name: string };
    };
  }>;
}

export default function PortfolioPage() {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"purchases" | "challenges">("purchases");

  useEffect(() => {
    fetch("/api/users/demo-user-1")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setUser(null);
        else setUser(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-card-bg border border-card-border rounded-xl p-8 animate-pulse h-64" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-muted text-lg mb-4">No user found. Seed demo data first.</p>
        <Link href="/" className="text-accent hover:text-accent-hover">
          Go to Signal Market
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-2">Portfolio</h1>
      <p className="text-muted mb-6">
        {user.name || "Anonymous User"} — Track your signal purchases and challenges
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{user.balance.toFixed(2)}</p>
          <p className="text-xs text-muted">Balance (USDC)</p>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{user.totalSpentUsdc.toFixed(2)}</p>
          <p className="text-xs text-muted">Total Spent</p>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success">{user.totalRewardsUsdc.toFixed(2)}</p>
          <p className="text-xs text-muted">Total Rewards</p>
        </div>
        <div className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
          <p className={`text-2xl font-bold ${user.challengePnl >= 0 ? "text-success" : "text-danger"}`}>
            {user.challengePnl >= 0 ? "+" : ""}{user.challengePnl.toFixed(2)}
          </p>
          <p className="text-xs text-muted">Challenge PnL</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("purchases")}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            tab === "purchases" ? "bg-accent text-white" : "bg-card-bg border border-card-border text-muted hover:text-white"
          }`}
        >
          Purchases ({user.purchases.length})
        </button>
        <button
          onClick={() => setTab("challenges")}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            tab === "challenges" ? "bg-accent text-white" : "bg-card-bg border border-card-border text-muted hover:text-white"
          }`}
        >
          Challenges ({user.challenges.length})
        </button>
      </div>

      {/* Content */}
      <div className="bg-card-bg border border-card-border rounded-xl p-5">
        {tab === "purchases" ? (
          user.purchases.length === 0 ? (
            <p className="text-center py-8 text-muted">No purchases yet</p>
          ) : (
            <div className="space-y-2">
              {user.purchases.map((p) => (
                <Link key={p.id} href={`/signal/${p.signal.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-card-border/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          p.signal.direction === "LONG" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                        }`}
                      >
                        {p.signal.market} {p.signal.direction}
                      </span>
                      <span className="text-sm text-muted">{p.signal.agent.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted">Paid: {p.amountUsdc}</span>
                      {p.refundAmount > 0 && <span className="text-success">Refund: {p.refundAmount.toFixed(2)}</span>}
                      {p.compensationAmount > 0 && <span className="text-warning">Comp: {p.compensationAmount.toFixed(2)}</span>}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        p.status === "COMPENSATED" ? "bg-success/20 text-success" : "bg-accent/20 text-accent"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          user.challenges.length === 0 ? (
            <p className="text-center py-8 text-muted">No challenges yet</p>
          ) : (
            <div className="space-y-2">
              {user.challenges.map((c) => (
                <Link key={c.id} href={`/signal/${c.signal.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-card-border/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          c.signal.direction === "LONG" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                        }`}
                      >
                        {c.signal.market} {c.signal.direction}
                      </span>
                      <span className="text-sm text-muted">{c.signal.agent.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted">Staked: {c.challengeAmount}</span>
                      {c.rewardAmount > 0 && <span className="text-success">Reward: {c.rewardAmount.toFixed(2)}</span>}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        c.status === "WON" ? "bg-success/20 text-success" : c.status === "LOST" ? "bg-danger/20 text-danger" : "bg-accent/20 text-accent"
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

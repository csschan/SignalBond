"use client";

import { useEffect, useState, useCallback } from "react";
import SignalCard from "@/components/SignalCard";
import PriceBar from "@/components/PriceBar";

type Signal = {
  id: string;
  market: string;
  direction: string;
  expiryTime: string;
  confidence: number;
  bondAmount: number;
  accessFee: number;
  publicSummary: string;
  status: string;
  createdAt: string;
  buyerCount: number;
  challengePool: number;
  challengeCount: number;
  agent: {
    id: string;
    name: string;
    reputationScore: number;
    successCount: number;
    totalSignals: number;
    avatarUrl: string | null;
  };
};

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const fetchSignals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("status", filter);
      const res = await fetch(`/api/signals?${params}`);
      const data = await res.json();
      setSignals(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 15000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  const [importing, setImporting] = useState(false);

  async function importBrain() {
    setImporting(true);
    let agentsRes = await fetch("/api/agents");
    let agents = await agentsRes.json();
    if (agents.length === 0) {
      // Auto-create agents
      await fetch("/api/demo", { method: "POST" });
      agentsRes = await fetch("/api/agents");
      agents = await agentsRes.json();
    }
    const res = await fetch("/api/brain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: agents[0].id }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(`Imported ${data.imported} signals from Brain AI (${data.skipped} skipped)`);
    } else {
      alert(data.error || "Import failed");
    }
    await fetchSignals();
    setImporting(false);
  }

  const statuses = ["ALL", "OPEN", "SETTLED"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Signal Market</h1>
        <p className="text-muted mb-4">
          AI trading signals backed by USDC. Every signal carries a bond.
        </p>
        <PriceBar />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 bg-card-bg border border-card-border rounded-lg p-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                filter === s
                  ? "bg-accent text-white"
                  : "text-muted hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={importBrain}
            disabled={importing}
            className="px-4 py-2 text-xs bg-success/20 hover:bg-success/30 text-success rounded-lg transition-colors disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import Brain AI"}
          </button>
        </div>
      </div>

      {/* Signal Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-card-bg border border-card-border rounded-xl p-5 h-48 animate-pulse"
            />
          ))}
        </div>
      ) : signals.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted text-lg mb-4">No signals yet</p>
          <button
            onClick={importBrain}
            disabled={importing}
            className="px-6 py-3 bg-success/20 hover:bg-success/30 text-success rounded-lg transition-colors disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import Brain AI Signals"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      )}
    </div>
  );
}

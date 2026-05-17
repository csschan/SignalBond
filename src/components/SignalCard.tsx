"use client";

import Link from "next/link";

interface SignalCardProps {
  signal: {
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
}

export default function SignalCard({ signal }: SignalCardProps) {
  const isLong = signal.direction === "LONG";
  const timeLeft = getTimeLeft(signal.expiryTime);
  const winRate =
    signal.agent.totalSignals > 0
      ? Math.round(
          (signal.agent.successCount / signal.agent.totalSignals) * 100
        )
      : 0;

  const statusColor = {
    OPEN: "bg-accent/20 text-accent",
    ACTIVE: "bg-blue-500/20 text-blue-400",
    SUCCESS: "bg-success/20 text-success",
    FAILED: "bg-danger/20 text-danger",
    EXPIRED: "bg-warning/20 text-warning",
    SETTLED: "bg-muted/20 text-muted",
    CANCELLED: "bg-muted/20 text-muted",
  }[signal.status] || "bg-muted/20 text-muted";

  return (
    <Link href={`/signal/${signal.id}`}>
      <div className="bg-card-bg border border-card-border rounded-xl p-5 hover:border-accent/50 transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                isLong
                  ? "bg-success/20 text-success"
                  : "bg-danger/20 text-danger"
              }`}
            >
              {signal.market.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {signal.market}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    isLong
                      ? "bg-success/20 text-success"
                      : "bg-danger/20 text-danger"
                  }`}
                >
                  {signal.direction}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">{signal.agent.name}</p>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>
            {signal.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <p className="text-muted text-xs">Confidence</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-card-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: `${signal.confidence}%` }}
                />
              </div>
              <span className="text-white font-medium">
                {signal.confidence}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-muted text-xs">Agent Bond</p>
            <p className="text-white font-medium mt-1">
              {signal.bondAmount} USDC
            </p>
          </div>
          <div>
            <p className="text-muted text-xs">Access Fee</p>
            <p className="text-white font-medium mt-1">
              {signal.accessFee} USDC
            </p>
          </div>
          <div>
            <p className="text-muted text-xs">Challenge Pool</p>
            <p className="text-warning font-medium mt-1">
              {signal.challengePool.toFixed(1)} USDC
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted border-t border-card-border pt-3">
          <div className="flex items-center gap-3">
            <span>Rep: {Math.round(signal.agent.reputationScore)}</span>
            <span>Win: {winRate}%</span>
            <span>Buyers: {signal.buyerCount}</span>
          </div>
          <span
            className={
              timeLeft === "Expired" ? "text-danger" : "text-accent"
            }
          >
            {timeLeft}
          </span>
        </div>
      </div>
    </Link>
  );
}

function getTimeLeft(expiryTime: string): string {
  const diff = new Date(expiryTime).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

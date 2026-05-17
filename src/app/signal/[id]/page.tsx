"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useWallet } from "@/contexts/WalletContext";
import { useSignalBond } from "@/hooks/useSignalBond";

interface Signal {
  id: string;
  agentId: string;
  market: string;
  direction: string;
  entryPrice: number | null;
  takeProfit: number | null;
  stopLoss: number | null;
  expiryTime: string;
  confidence: number;
  bondAmount: number;
  accessFee: number;
  publicSummary: string;
  privateReasoning: string | null;
  status: string;
  settlementPrice: number | null;
  settlementResult: string | null;
  createdAt: string;
  settledAt: string | null;
  agent: {
    id: string;
    name: string;
    reputationScore: number;
    totalSignals: number;
    successCount: number;
    failureCount: number;
    balance: number;
  };
  purchases: Array<{
    id: string;
    userId: string;
    amountUsdc: number;
    refundAmount: number;
    compensationAmount: number;
    status: string;
    user: { id: string; name: string | null };
  }>;
  challenges: Array<{
    id: string;
    userId: string;
    challengeAmount: number;
    rewardAmount: number;
    status: string;
    user: { id: string; name: string | null };
  }>;
  settlement: {
    result: string;
    slashAmount: number;
    buyerRefundPool: number;
    buyerCompensationPool: number;
    challengerRewardPool: number;
    protocolFee: number;
    agentPayout: number;
    challengerLossPool: number;
  } | null;
}

export default function SignalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [txPending, setTxPending] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const { address, connected } = useWallet();
  const { buySignal, challengeSignal, ready: chainReady, loading: chainLoading } = useSignalBond();

  // Use wallet address as userId, fallback to demo user
  const currentUserId = address || "demo-user-1";

  function fetchSignal() {
    return fetch(`/api/signals/${id}?userId=${currentUserId}`).then((r) => r.json());
  }

  useEffect(() => {
    fetchSignal().then((data) => {
      setSignal(data);
      setLoading(false);
    });
    const interval = setInterval(() => {
      fetchSignal().then(setSignal);
    }, 15000);
    return () => clearInterval(interval);
  }, [id, currentUserId]);

  async function handleBuy() {
    if (!signal) return;
    if (!connected) {
      alert("Please connect your wallet first");
      return;
    }

    setTxPending(true);
    setLastTxHash(null);

    try {
      // Step 1: Wallet pays USDC
      const txHash = await buySignal(signal.id, signal.accessFee);
      if (txHash) setLastTxHash(txHash);

      // Step 2: Record in DB
      await fetch(`/api/signals/${id}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, txHash }),
      });

      setPurchased(true);
      const updated = await fetchSignal();
      setSignal(updated);
    } catch (err: unknown) {
      const msg = (err as Error).message || "Transaction failed";
      if (!msg.includes("user rejected")) {
        alert(`Transaction failed: ${msg}`);
      }
    } finally {
      setTxPending(false);
    }
  }

  async function handleChallenge() {
    if (!signal) return;
    if (!connected) {
      alert("Please connect your wallet first");
      return;
    }
    const amount = prompt("Enter challenge amount (USDC):", "5");
    if (!amount) return;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setTxPending(true);
    setLastTxHash(null);

    try {
      // Step 1: Wallet pays USDC
      const txHash = await challengeSignal(signal.id, parsedAmount);
      if (txHash) setLastTxHash(txHash);

      // Step 2: Record in DB
      await fetch(`/api/signals/${id}/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, amount: parsedAmount, txHash }),
      });

      const updated = await fetchSignal();
      setSignal(updated);
    } catch (err: unknown) {
      const msg = (err as Error).message || "Transaction failed";
      if (!msg.includes("user rejected")) {
        alert(`Transaction failed: ${msg}`);
      }
    } finally {
      setTxPending(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-card-bg border border-card-border rounded-xl p-8 animate-pulse h-96" />
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-muted">Signal not found</p>
      </div>
    );
  }

  const isLong = signal.direction === "LONG";
  const winRate =
    signal.agent.totalSignals > 0
      ? Math.round((signal.agent.successCount / signal.agent.totalSignals) * 100)
      : 0;
  const challengePool = signal.challenges.reduce((s, c) => s + c.challengeAmount, 0);
  const hasPurchased = purchased || signal.purchases.some((p) => p.userId.toLowerCase() === currentUserId.toLowerCase());
  const isResolved = ["SUCCESS", "FAILED", "EXPIRED", "SETTLED"].includes(signal.status);
  const unlocked = hasPurchased || isResolved;
  const isBusy = txPending || chainLoading;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-muted hover:text-accent mb-4 inline-block">
        &larr; Back to Market
      </Link>

      {/* On-chain tx notification */}
      {lastTxHash && (
        <div className="mb-4 bg-success/10 border border-success/30 rounded-lg p-3 text-sm">
          <span className="text-success font-medium">Transaction confirmed!</span>{" "}
          <a
            href={`https://testnet.arcscan.io/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover underline"
          >
            View on Arc Explorer
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main signal info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card-bg border border-card-border rounded-xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{signal.market}</h1>
                  <span
                    className={`text-sm font-medium px-3 py-1 rounded-lg ${
                      isLong ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                    }`}
                  >
                    {signal.direction}
                  </span>
                </div>
                <p className="text-muted text-sm">{signal.publicSummary}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  signal.status === "SUCCESS"
                    ? "bg-success/20 text-success"
                    : signal.status === "FAILED"
                    ? "bg-danger/20 text-danger"
                    : signal.status === "EXPIRED"
                    ? "bg-warning/20 text-warning"
                    : "bg-accent/20 text-accent"
                }`}
              >
                {signal.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <InfoBox label="Confidence" value={`${signal.confidence}%`} />
              <InfoBox label="Agent Bond" value={`${signal.bondAmount} USDC`} />
              <InfoBox label="Access Fee" value={`${signal.accessFee} USDC`} />
              <InfoBox label="Expiry" value={formatExpiry(signal.expiryTime)} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <InfoBox label="Challenge Pool" value={`${challengePool.toFixed(1)} USDC`} className="text-warning" />
              <InfoBox label="Buyers" value={`${signal.purchases.length}`} />
              <InfoBox label="Agent Rep" value={`${Math.round(signal.agent.reputationScore)}`} />
              <InfoBox label="Win Rate" value={`${winRate}%`} className="text-success" />
            </div>
          </div>

          {/* Trade Plan — locked until purchased */}
          <div className="bg-card-bg border border-card-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Trade Plan</h2>
            {unlocked ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <InfoBox label="Entry" value={`$${signal.entryPrice?.toLocaleString()}`} />
                  <InfoBox label="Take Profit" value={`$${signal.takeProfit?.toLocaleString()}`} className="text-success" />
                  <InfoBox label="Stop Loss" value={`$${signal.stopLoss?.toLocaleString()}`} className="text-danger" />
                </div>
                {signal.entryPrice && signal.takeProfit && signal.stopLoss && (
                  <div className="text-xs text-muted border-t border-card-border pt-3">
                    R:R Ratio: {(Math.abs(signal.takeProfit - signal.entryPrice) / Math.abs(signal.entryPrice - signal.stopLoss)).toFixed(1)}:1
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="flex justify-center gap-4 mb-4 opacity-30 blur-sm select-none pointer-events-none">
                  <InfoBox label="Entry" value="$--,---.--" />
                  <InfoBox label="Take Profit" value="$--,---.--" className="text-success" />
                  <InfoBox label="Stop Loss" value="$--,---.--" className="text-danger" />
                </div>
                <p className="text-muted text-sm mb-3">
                  Purchase to unlock Entry, TP, SL and full trade plan
                </p>
                <button
                  onClick={handleBuy}
                  disabled={isBusy}
                  className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  {isBusy ? "Confirming tx..." : `Buy Signal — ${signal.accessFee} USDC`}
                </button>
              </div>
            )}
          </div>

          {/* AI Reasoning */}
          <div className="bg-card-bg border border-card-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">AI Reasoning</h2>
            {unlocked && signal.privateReasoning ? (
              <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                {signal.privateReasoning}
              </pre>
            ) : unlocked ? (
              <p className="text-muted text-sm">No reasoning data available.</p>
            ) : (
              <div className="text-center py-6">
                <div className="space-y-2 mb-4 opacity-20 blur-sm select-none pointer-events-none">
                  <p className="text-sm">1. ████████ ██████ ██ ████████.</p>
                  <p className="text-sm">2. ████ ███ ███████ ██ ██████████.</p>
                  <p className="text-sm">3. █████████ ██████████ ████████ ████████.</p>
                </div>
                <p className="text-muted text-sm">
                  Purchase to view the full AI analysis behind this signal
                </p>
              </div>
            )}
          </div>

          {/* Settlement details */}
          {signal.settlement && (
            <div className="bg-card-bg border border-card-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Settlement</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoBox
                  label="Result"
                  value={signal.settlement.result}
                  className={
                    signal.settlement.result === "SUCCESS"
                      ? "text-success"
                      : signal.settlement.result === "FAILED"
                      ? "text-danger"
                      : "text-warning"
                  }
                />
                <InfoBox label="Settlement Price" value={signal.settlementPrice ? `$${signal.settlementPrice.toLocaleString()}` : "—"} />

                {signal.settlement.result === "SUCCESS" && (
                  <>
                    <InfoBox label="Agent Payout" value={`${signal.settlement.agentPayout.toFixed(2)} USDC`} className="text-success" />
                    <InfoBox label="Agent Bond Returned" value={`${signal.bondAmount} USDC`} />
                    <InfoBox label="Access Fee Revenue" value={`${(signal.settlement.agentPayout - signal.bondAmount - signal.settlement.challengerLossPool).toFixed(2)} USDC`} className="text-success" />
                    <InfoBox label="Challenger Loss" value={`${signal.settlement.challengerLossPool.toFixed(2)} USDC`} className="text-danger" />
                  </>
                )}

                {signal.settlement.result === "FAILED" && (
                  <>
                    <InfoBox label="Slash Amount" value={`${signal.settlement.slashAmount.toFixed(2)} USDC`} className="text-danger" />
                    <InfoBox label="Buyer Refund" value={`${signal.settlement.buyerRefundPool.toFixed(2)} USDC`} />
                    <InfoBox label="Buyer Compensation" value={`${signal.settlement.buyerCompensationPool.toFixed(2)} USDC`} className="text-success" />
                    <InfoBox label="Challenger Reward" value={`${signal.settlement.challengerRewardPool.toFixed(2)} USDC`} className="text-success" />
                    <InfoBox label="Protocol Fee" value={`${signal.settlement.protocolFee.toFixed(2)} USDC`} />
                  </>
                )}

                {signal.settlement.result === "EXPIRED" && (
                  <>
                    <InfoBox label="Agent Bond" value={`${signal.bondAmount} USDC (returned)`} />
                    <InfoBox label="Buyer Refund" value={`${signal.settlement.buyerRefundPool.toFixed(2)} USDC (50%)`} />
                    <InfoBox label="Challenger Stakes" value="Returned" />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Agent card */}
          <div className="bg-card-bg border border-card-border rounded-xl p-5">
            <h3 className="text-sm text-muted mb-3">Signal Provider</h3>
            <Link href={`/agent/${signal.agent.id}`} className="block group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center text-accent font-bold text-sm">
                  {signal.agent.name.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-medium group-hover:text-accent transition-colors">
                    {signal.agent.name}
                  </p>
                  <p className="text-xs text-muted">Rep: {Math.round(signal.agent.reputationScore)}</p>
                </div>
              </div>
            </Link>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted text-xs">Win Rate</p>
                <p className="text-white font-medium">{winRate}%</p>
              </div>
              <div>
                <p className="text-muted text-xs">Total Signals</p>
                <p className="text-white font-medium">{signal.agent.totalSignals}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isResolved && (
            <div className="bg-card-bg border border-card-border rounded-xl p-5 space-y-3">
              {!connected && (
                <p className="text-xs text-warning text-center mb-2">
                  Connect wallet to pay with USDC on Arc testnet
                </p>
              )}
              <button
                onClick={handleBuy}
                disabled={hasPurchased || isBusy}
                className="w-full px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBusy
                  ? "Confirming tx..."
                  : hasPurchased
                  ? "Purchased"
                  : `Buy Signal — ${signal.accessFee} USDC`}
              </button>
              <button
                onClick={handleChallenge}
                disabled={isBusy}
                className="w-full px-4 py-3 bg-danger/20 hover:bg-danger/30 text-danger rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {isBusy ? "Confirming tx..." : "Challenge Signal"}
              </button>
              {!hasPurchased && (
                <p className="text-xs text-muted text-center">
                  All payments are USDC on Arc testnet
                </p>
              )}
            </div>
          )}

          {/* Purchases */}
          {signal.purchases.length > 0 && (
            <div className="bg-card-bg border border-card-border rounded-xl p-5">
              <h3 className="text-sm text-muted mb-3">Buyers ({signal.purchases.length})</h3>
              <div className="space-y-2">
                {signal.purchases.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="text-foreground">{p.user.name || `${p.userId.slice(0, 8)}...`}</span>
                    <span className="text-muted">{p.amountUsdc} USDC</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Challenges */}
          {signal.challenges.length > 0 && (
            <div className="bg-card-bg border border-card-border rounded-xl p-5">
              <h3 className="text-sm text-muted mb-3">Challengers ({signal.challenges.length})</h3>
              <div className="space-y-2">
                {signal.challenges.map((c) => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span className="text-foreground">{c.user.name || `${c.userId.slice(0, 8)}...`}</span>
                    <div className="text-right">
                      <span className="text-warning">{c.challengeAmount} USDC</span>
                      {c.status !== "ACTIVE" && (
                        <span className={`ml-2 text-xs ${c.status === "WON" ? "text-success" : "text-danger"}`}>
                          {c.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-muted text-xs mb-1">{label}</p>
      <p className={`font-medium ${className || "text-white"}`}>{value}</p>
    </div>
  );
}

function formatExpiry(expiryTime: string): string {
  const diff = new Date(expiryTime).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

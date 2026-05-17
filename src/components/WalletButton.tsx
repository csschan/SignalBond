"use client";

import { useWallet } from "@/contexts/WalletContext";

export default function WalletButton() {
  const { address, usdcBalance, connected, connecting, wrongNetwork, connect, disconnect, switchToArc } = useWallet();

  if (!connected) {
    return (
      <button
        onClick={connect}
        disabled={connecting}
        className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50"
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  if (wrongNetwork) {
    return (
      <button
        onClick={switchToArc}
        className="px-4 py-2 text-sm bg-warning/20 text-warning rounded-lg hover:bg-warning/30 transition-colors"
      >
        Switch to Arc Testnet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right text-sm">
        <p className="text-white font-medium">{parseFloat(usdcBalance).toFixed(2)} USDC</p>
      </div>
      <button
        onClick={disconnect}
        className="px-3 py-2 text-sm bg-card-bg border border-card-border text-muted hover:text-white rounded-lg transition-colors"
        title={address || ""}
      >
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </button>
    </div>
  );
}

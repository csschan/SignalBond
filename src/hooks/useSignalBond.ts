"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/contexts/WalletContext";

// All payments go to operator wallet as native USDC transfers
const OPERATOR = "0x9484842eC4f906209fc7c6129FA7036D465c7336";

export function useSignalBond() {
  const { signer, address, connected, wrongNetwork, refreshBalances } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buySignal(_signalId: string, accessFee: number): Promise<string | null> {
    if (!signer || !connected) throw new Error("Connect wallet first");
    if (wrongNetwork) throw new Error("Switch to Arc testnet first");

    setLoading(true);
    setError(null);

    try {
      const value = ethers.parseEther(accessFee.toString());
      const tx = await signer.sendTransaction({ to: OPERATOR, value });
      const receipt = await tx.wait();
      await refreshBalances();
      return receipt.hash;
    } catch (err: unknown) {
      const msg = (err as Error).message || "Transaction failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function challengeSignal(_signalId: string, amount: number): Promise<string | null> {
    if (!signer || !connected) throw new Error("Connect wallet first");
    if (wrongNetwork) throw new Error("Switch to Arc testnet first");

    setLoading(true);
    setError(null);

    try {
      const value = ethers.parseEther(amount.toString());
      const tx = await signer.sendTransaction({ to: OPERATOR, value });
      const receipt = await tx.wait();
      await refreshBalances();
      return receipt.hash;
    } catch (err: unknown) {
      const msg = (err as Error).message || "Transaction failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return {
    buySignal,
    challengeSignal,
    loading,
    error,
    ready: connected && !wrongNetwork,
    walletAddress: address,
  };
}

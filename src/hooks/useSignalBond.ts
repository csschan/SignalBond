"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/contexts/WalletContext";
import { ARC_CONFIG, SIGNALBOND_ABI } from "@/services/arc/config";

function toBytes32(id: string): string {
  return ethers.id(id);
}

export function useSignalBond() {
  const { signer, address, connected, wrongNetwork, refreshBalances } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractAddr = ARC_CONFIG.contracts.signalBond;

  async function isSignalOnChain(signalId: string): Promise<boolean> {
    if (!signer || !contractAddr) return false;
    try {
      const contract = new ethers.Contract(contractAddr, SIGNALBOND_ABI, signer);
      const data = await contract.signals(toBytes32(signalId));
      return data[0] !== ethers.ZeroAddress;
    } catch {
      return false;
    }
  }

  async function buySignal(signalId: string, accessFee: number): Promise<string | null> {
    if (!signer || !connected) throw new Error("Connect wallet first");
    if (wrongNetwork) throw new Error("Switch to Arc testnet first");

    setLoading(true);
    setError(null);

    try {
      const value = ethers.parseEther(accessFee.toString());
      let receipt;

      if (contractAddr && await isSignalOnChain(signalId)) {
        // Signal on-chain → call contract
        const contract = new ethers.Contract(contractAddr, SIGNALBOND_ABI, signer);
        const tx = await contract.buySignal(toBytes32(signalId), { value });
        receipt = await tx.wait();
      } else {
        // Signal not on-chain → direct USDC transfer to contract/operator
        const target = contractAddr || "0x9484842eC4f906209fc7c6129FA7036D465c7336";
        const tx = await signer.sendTransaction({ to: target, value });
        receipt = await tx.wait();
      }

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

  async function challengeSignal(signalId: string, amount: number): Promise<string | null> {
    if (!signer || !connected) throw new Error("Connect wallet first");
    if (wrongNetwork) throw new Error("Switch to Arc testnet first");

    setLoading(true);
    setError(null);

    try {
      const value = ethers.parseEther(amount.toString());
      let receipt;

      if (contractAddr && await isSignalOnChain(signalId)) {
        const contract = new ethers.Contract(contractAddr, SIGNALBOND_ABI, signer);
        const tx = await contract.challengeSignal(toBytes32(signalId), { value });
        receipt = await tx.wait();
      } else {
        const target = contractAddr || "0x9484842eC4f906209fc7c6129FA7036D465c7336";
        const tx = await signer.sendTransaction({ to: target, value });
        receipt = await tx.wait();
      }

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

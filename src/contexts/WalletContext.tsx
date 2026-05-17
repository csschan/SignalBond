"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { ethers } from "ethers";
import { ARC_CONFIG } from "@/services/arc/config";

interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string; // native balance
  usdcBalance: string;
  connected: boolean;
  connecting: boolean;
  wrongNetwork: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToArc: () => Promise<void>;
  refreshBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

const ARC_CHAIN_ID = ARC_CONFIG.testnet.chainId;
const ARC_CHAIN_ID_HEX = `0x${ARC_CHAIN_ID.toString(16)}`;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    balance: "0",
    usdcBalance: "0",
    connected: false,
    connecting: false,
    wrongNetwork: false,
    provider: null,
    signer: null,
  });

  const refreshBalances = useCallback(async () => {
    if (!state.provider || !state.address) return;
    try {
      // On Arc, native balance IS USDC
      const balance = await state.provider.getBalance(state.address);
      const formatted = ethers.formatEther(balance);
      setState((s) => ({
        ...s,
        balance: formatted,
        usdcBalance: formatted,
      }));
    } catch {
      // silent
    }
  }, [state.provider, state.address]);

  const connect = useCallback(async () => {
    const ethereum = (window as unknown as { ethereum?: ethers.Eip1193Provider }).ethereum;
    if (!ethereum) {
      alert("Please install MetaMask or another wallet extension");
      return;
    }

    setState((s) => ({ ...s, connecting: true }));

    try {
      const provider = new ethers.BrowserProvider(ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const wrongNetwork = chainId !== ARC_CHAIN_ID;

      // On Arc, native balance IS USDC
      const balance = await provider.getBalance(address);
      const formatted = ethers.formatEther(balance);

      setState({
        address,
        chainId,
        balance: formatted,
        usdcBalance: formatted,
        connected: true,
        connecting: false,
        wrongNetwork,
        provider,
        signer,
      });
    } catch (err) {
      console.error("Wallet connect failed:", err);
      setState((s) => ({ ...s, connecting: false }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      chainId: null,
      balance: "0",
      usdcBalance: "0",
      connected: false,
      connecting: false,
      wrongNetwork: false,
      provider: null,
      signer: null,
    });
  }, []);

  const switchToArc = useCallback(async () => {
    const ethereum = (window as unknown as { ethereum?: ethers.Eip1193Provider & { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!ethereum) return;

    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARC_CHAIN_ID_HEX }],
      });
    } catch (switchError: unknown) {
      if ((switchError as { code?: number }).code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: ARC_CHAIN_ID_HEX,
              chainName: ARC_CONFIG.testnet.name,
              rpcUrls: [ARC_CONFIG.testnet.rpcUrl],
              blockExplorerUrls: [ARC_CONFIG.testnet.explorerUrl],
              nativeCurrency: ARC_CONFIG.testnet.nativeCurrency,
            },
          ],
        });
      }
    }

    // Reconnect after switch
    await connect();
  }, [connect]);

  // Listen for account/chain changes
  useEffect(() => {
    const ethereum = (window as unknown as { ethereum?: { on: (event: string, handler: (...args: unknown[]) => void) => void; removeListener: (event: string, handler: (...args: unknown[]) => void) => void } }).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = () => {
      if (state.connected) connect();
    };
    const handleChainChanged = () => {
      if (state.connected) connect();
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [state.connected, connect]);

  return (
    <WalletContext.Provider
      value={{ ...state, connect, disconnect, switchToArc, refreshBalances }}
    >
      {children}
    </WalletContext.Provider>
  );
}

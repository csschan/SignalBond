import { ethers } from "ethers";
import { ARC_CONFIG, SIGNALBOND_ABI } from "./config";

// ============================================================
// Arc Chain Client — native USDC, no ERC-20
// ============================================================

export function getProvider() {
  return new ethers.JsonRpcProvider(ARC_CONFIG.testnet.rpcUrl);
}

export function getSigner(privateKey: string) {
  return new ethers.Wallet(privateKey, getProvider());
}

export function getSignalBondContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(
    ARC_CONFIG.contracts.signalBond,
    SIGNALBOND_ABI,
    signerOrProvider
  );
}

export function toBytes32(id: string): string {
  return ethers.id(id);
}

/** Get native USDC balance of an address on Arc */
export async function getUsdcBalance(address: string): Promise<number> {
  const provider = getProvider();
  const balance = await provider.getBalance(address);
  return Number(ethers.formatEther(balance));
}

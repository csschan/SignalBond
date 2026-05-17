import { ethers } from "ethers";
import { ARC_CONFIG, SIGNALBOND_ABI } from "./config";

const ARC_ENABLED = process.env.ARC_ENABLED === "true";
const OPERATOR_KEY = process.env.ARC_OPERATOR_PRIVATE_KEY || "";

interface ChainResult {
  txHash: string | null;
  onChain: boolean;
}

// Shared provider/signer/contract — avoids nonce conflicts
let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.Wallet | null = null;
let _contract: ethers.Contract | null = null;
let _nonce: number | null = null;
let _noncelock = false;

function getShared() {
  if (!OPERATOR_KEY || !ARC_CONFIG.contracts.signalBond) return null;
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(ARC_CONFIG.testnet.rpcUrl);
    _signer = new ethers.Wallet(OPERATOR_KEY, _provider);
    _contract = new ethers.Contract(ARC_CONFIG.contracts.signalBond, SIGNALBOND_ABI, _signer);
  }
  return { provider: _provider, signer: _signer!, contract: _contract! };
}

async function getNextNonce(): Promise<number> {
  const ctx = getShared();
  if (!ctx) return 0;
  // Wait if another tx is getting nonce
  while (_noncelock) await new Promise((r) => setTimeout(r, 100));
  _noncelock = true;
  try {
    if (_nonce === null) {
      _nonce = await ctx.provider.getTransactionCount(ctx.signer.address, "pending");
    }
    const n = _nonce;
    _nonce++;
    return n;
  } finally {
    _noncelock = false;
  }
}

function resetNonce() {
  _nonce = null;
}

function toBytes32(id: string): string {
  return ethers.id(id);
}

export async function syncCreateSignal(
  signalId: string,
  _agentKey: string | null,
  bondAmount: number,
  accessFee: number
): Promise<ChainResult> {
  if (!ARC_ENABLED) return { txHash: null, onChain: false };
  const ctx = getShared();
  if (!ctx) return { txHash: null, onChain: false };

  try {
    const signalIdBytes = toBytes32(signalId);
    const value = ethers.parseEther(bondAmount.toString());
    const fee = ethers.parseEther(accessFee.toString());
    const nonce = await getNextNonce();

    const tx = await ctx.contract.createSignal(signalIdBytes, fee, { value, nonce });
    const receipt = await tx.wait();

    console.log(`[Arc] Signal ${signalId} created on-chain: ${receipt.hash}`);
    return { txHash: receipt.hash, onChain: true };
  } catch (err) {
    console.error(`[Arc] Failed to create signal on-chain:`, err);
    resetNonce(); // reset on failure so next tx re-fetches
    return { txHash: null, onChain: false };
  }
}

export async function syncBuySignal(): Promise<ChainResult> {
  return { txHash: null, onChain: false };
}

export async function syncChallengeSignal(): Promise<ChainResult> {
  return { txHash: null, onChain: false };
}

export async function syncSettleSignal(
  signalId: string,
  result: "SUCCESS" | "FAILED" | "EXPIRED"
): Promise<ChainResult> {
  if (!ARC_ENABLED || !OPERATOR_KEY) return { txHash: null, onChain: false };
  const ctx = getShared();
  if (!ctx) return { txHash: null, onChain: false };

  const resultMap = { SUCCESS: 1, FAILED: 2, EXPIRED: 3 } as const;
  const signalIdBytes = toBytes32(signalId);

  try {
    const onChainData = await ctx.contract.signals(signalIdBytes);
    if (onChainData[0] === ethers.ZeroAddress) {
      return { txHash: null, onChain: false };
    }
    if (Number(onChainData[7]) !== 0) {
      return { txHash: null, onChain: false };
    }

    const nonce = await getNextNonce();
    const tx = await ctx.contract.settleSignal(signalIdBytes, resultMap[result], { nonce });
    const receipt = await tx.wait();

    console.log(`[Arc] Signal ${signalId} settled on-chain: ${receipt.hash}`);
    return { txHash: receipt.hash, onChain: true };
  } catch (err) {
    console.error(`[Arc] Failed to settle on-chain:`, err);
    resetNonce();
    return { txHash: null, onChain: false };
  }
}

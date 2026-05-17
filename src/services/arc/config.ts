// Arc Chain Testnet Configuration
// Arc is Circle's L1 — USDC is the native currency (like ETH on Ethereum)
// No ERC-20 approve needed, just send native USDC via msg.value

export const ARC_CONFIG = {
  testnet: {
    chainId: 5042002,
    name: "Arc Testnet",
    rpcUrl: "https://arc-testnet.drpc.org",
    explorerUrl: "https://testnet.arcscan.app",
    nativeCurrency: {
      name: "USDC",
      symbol: "USDC",
      decimals: 18,
    },
  },

  contracts: {
    signalBond: process.env.NEXT_PUBLIC_SIGNALBOND_CONTRACT || "",
  },
};

// SignalBond contract ABI — all functions use native USDC (payable)
export const SIGNALBOND_ABI = [
  "function createSignal(bytes32 signalId, uint256 accessFee) external payable",
  "function buySignal(bytes32 signalId) external payable",
  "function challengeSignal(bytes32 signalId) external payable",
  "function settleSignal(bytes32 signalId, uint8 result) external",
  "function signals(bytes32) view returns (address agent, uint256 bondAmount, uint256 accessFee, uint256 totalAccessFees, uint256 totalChallengeAmount, uint256 buyerCount, uint256 challengerCount, uint8 status)",
  "event SignalCreated(bytes32 indexed signalId, address indexed agent, uint256 bondAmount, uint256 accessFee)",
  "event SignalPurchased(bytes32 indexed signalId, address indexed buyer, uint256 amount)",
  "event SignalChallenged(bytes32 indexed signalId, address indexed challenger, uint256 amount)",
  "event SignalSettled(bytes32 indexed signalId, uint8 status, uint256 slashAmount)",
] as const;

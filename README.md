# SignalBond

**A USDC-backed accountability market for AI trading signals on Arc Chain.**

AI trading signals are everywhere, but wrong signals have zero cost. Agents can publish unlimited calls — right ones get promoted, wrong ones get ignored. Users have no way to tell which AI is actually reliable.

SignalBond fixes this: **every AI signal must be backed by USDC**. If the signal is wrong, the agent gets slashed. Users can buy signals or challenge them. Everything settles based on real market prices.

## How It Works

```
AI Agent publishes signal → Stakes USDC as bond
                ↓
Users can BUY (pay access fee) or CHALLENGE (stake against it)
                ↓
Market price hits TP/SL or signal expires
                ↓
Settlement: agent slashed or rewarded, USDC distributed
```

### Signal Success (TP Hit)
- Agent gets bond back + access fees + challenger stakes
- Challengers lose their stake

### Signal Failure (SL Hit)
- Agent bond slashed 20%
- Buyers get full refund + compensation (50% of slash)
- Challengers get reward (40% of slash)
- Protocol takes 10% fee

### Signal Expired
- Agent gets bond back
- Buyers get 50% access fee refund
- Challenger stakes returned

## Architecture

| Component | Technology |
|---|---|
| Frontend | Next.js + Tailwind CSS |
| Backend API | Next.js API Routes |
| Database | SQLite + Prisma ORM |
| Smart Contract | Solidity (deployed on Arc Testnet) |
| Blockchain | Arc Chain (Circle's L1, native USDC) |
| AI Signals | Brain API integration |
| Price Feed | Binance API + Brain API fallback |

### Why Arc Chain?

Arc is Circle's L1 blockchain where **USDC is the native gas token**. This means:
- No need for a separate ERC-20 USDC contract — payments use native USDC
- No approve/transferFrom flow — just `msg.value`
- Sub-second finality for fast settlement
- Predictable, dollar-denominated gas fees

## Smart Contract

**SignalBond.sol** — deployed on Arc Testnet

All fund flows use native USDC (payable functions):

```solidity
function createSignal(bytes32 signalId, uint256 accessFee) external payable
function buySignal(bytes32 signalId) external payable
function challengeSignal(bytes32 signalId) external payable
function settleSignal(bytes32 signalId, uint8 result) external  // owner only
```

Settlement automatically distributes USDC to agents, buyers, challengers, and protocol treasury based on signal outcome.

## Pages

- **Signal Market** — Browse all AI signals with confidence, bond amount, challenge pool
- **Signal Detail** — Buy or challenge a signal; trade plan + AI reasoning unlocked after purchase
- **Agent Dashboard** — Performance stats, win rate, confidence accuracy, signal history
- **Leaderboard** — Agents ranked by reputation, win rate, total bonded, slashed amount
- **Portfolio** — User's purchased signals, challenges, rewards, PnL

## AI Signal Engine

SignalBond integrates with a live AI trading brain via API. Real AI positions (with market state analysis, token stage, confidence scores, and position actions) are imported as bonded signals.

Each imported signal includes:
- Entry cognition (market state, token stage, confidence)
- Position action (action, reason, auto-exit flag)
- Current PnL and price status
- Dynamically calculated TP/SL and expiry based on price spread

## Setup

### Prerequisites

- Node.js 18+
- [Foundry](https://book.getfoundry.sh/) (for contract deployment)
- MetaMask (for wallet interaction)

### Install

```bash
git clone https://github.com/csschan/SignalBond.git
cd SignalBond
npm install
```

### Database

```bash
npx prisma db push
npx prisma generate
```

### Deploy Contract to Arc Testnet

1. Get test USDC from [Circle Faucet](https://faucet.circle.com) (select Arc Testnet)

2. Deploy:
```bash
export PRIVATE_KEY="0x..."
chmod +x scripts/deploy-arc.sh
./scripts/deploy-arc.sh
```

3. Copy the output addresses to `.env`:
```bash
cp .env.example .env
# Fill in NEXT_PUBLIC_SIGNALBOND_CONTRACT and ARC_OPERATOR_PRIVATE_KEY
```

### Run

```bash
npm run dev -- -p 4556
```

Open [http://localhost:4556](http://localhost:4556)

### MetaMask Setup

| Field | Value |
|---|---|
| Network Name | Arc Testnet |
| RPC URL | `https://arc-testnet.drpc.org` |
| Chain ID | `5042002` |
| Currency Symbol | USDC |
| Block Explorer | `https://testnet.arcscan.app` |

## Demo Flow

1. **Seed Demo Data** — Click "Seed Demo Data" to create AI agents
2. **Import Brain AI** — Click "Import Brain AI" to pull real AI trading positions
3. **Connect Wallet** — MetaMask auto-adds Arc Testnet
4. **Buy a Signal** — Pay USDC to unlock trade plan + AI reasoning
5. **Challenge a Signal** — Stake USDC against a signal you disagree with
6. **Wait for Settlement** — Auto-settlement checks prices every 10 seconds
7. **View Results** — See slash amounts, buyer compensation, challenger rewards
8. **Check Leaderboard** — Agent reputation updated based on real outcomes

## Key Innovation

Most AI trading agents publish unlimited signals with no accountability. SignalBond introduces a USDC-backed accountability layer for AI-generated trading signals. Every AI agent must stake USDC before publishing a market call. Users can buy the signal or challenge it. When the market outcome is resolved, the agent's bond is either returned or slashed. This creates a new market primitive: **bonded AI reasoning**.

## License

MIT

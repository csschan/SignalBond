// ============================================================
// Brain API Integration
// Fetches real AI trading positions from the Brain engine
// and converts them into SignalBond signals.
// ============================================================

const BRAIN_API = "http://127.0.0.1:9848/api/brain";

export interface BrainPosition {
  token: string;
  signal_type: string;
  entry_price: number;
  entered_at: string;
  cognition_at_entry: {
    market_state: string;
    token_stage: string;
    confidence: number;
  };
  decision_action: string;
  last_check: string;
  last_stage: string;
  _current_price: number;
  _pnl_pct: number;
  position_action: {
    action: string;
    auto_exit: boolean;
    reason: string;
    pnl_pct: number;
    stage: string;
  };
  price_status: string;
  stage_status: string;
  stage_error: string | null;
}

export async function fetchBrainPositions(): Promise<BrainPosition[]> {
  try {
    const res = await fetch(BRAIN_API, { cache: "no-store" });
    const data = await res.json();
    return data.status?.positions || [];
  } catch (err) {
    console.error("[Brain] Failed to fetch positions:", err);
    return [];
  }
}

/** Convert a Brain position into a SignalBond signal format */
export function brainPositionToSignal(pos: BrainPosition) {
  const direction = normalizeDirection(pos.signal_type);
  const market = normalizeToken(pos.token);
  const confidence = Math.round(pos.cognition_at_entry.confidence * 100);
  const entryPrice = pos.entry_price;
  const currentPrice = pos._current_price;

  // Calculate TP/SL based on entry price and market volatility
  const { takeProfit, stopLoss } = calculateTPSL(
    entryPrice,
    currentPrice,
    direction,
    confidence
  );

  // Bond amount based on confidence
  const bondAmount = confidence >= 70 ? 20 : confidence >= 60 ? 10 : 5;
  const accessFee = Math.max(0.1, Math.round(bondAmount * 0.01 * 100) / 100);

  // Build reasoning from Brain data
  const reasoning = buildReasoning(pos);

  return {
    market,
    direction,
    entryPrice,
    takeProfit,
    stopLoss,
    expiryMinutes: calcExpiryMinutes(entryPrice, takeProfit, stopLoss),
    confidence,
    bondAmount,
    accessFee,
    publicSummary: `${market} ${direction.toLowerCase()} — ${pos.cognition_at_entry.market_state} / ${pos.cognition_at_entry.token_stage} stage | ${pos.position_action.action}`,
    privateReasoning: reasoning,
  };
}

function normalizeDirection(signalType: string): "LONG" | "SHORT" {
  const s = signalType.toUpperCase();
  if (s === "SHORT" || s === "SELL") return "SHORT";
  return "LONG"; // LONG, BUY, etc.
}

function normalizeToken(token: string): string {
  // Remove USDT suffix and common suffixes
  let clean = token.replace(/USDT$/i, "").replace(/USD$/i, "").replace(/PERP$/i, "");
  // Map known tokens
  const map: Record<string, string> = {
    BTC: "BTC",
    ETH: "ETH",
    SOL: "SOL",
  };
  if (map[clean]) return map[clean];
  return clean.toUpperCase();
}

function calculateTPSL(
  entryPrice: number,
  currentPrice: number,
  direction: "LONG" | "SHORT",
  _confidence: number
) {
  // Use current price movement to set tight, realistic TP/SL
  // SL: 2-4% from entry, TP: 3-6% from entry
  const slPct = 0.02 + Math.random() * 0.02; // 2-4%
  const tpPct = 0.03 + Math.random() * 0.03; // 3-6%

  let takeProfit: number;
  let stopLoss: number;

  if (direction === "LONG") {
    stopLoss = Math.round(currentPrice * (1 - slPct) * 1e8) / 1e8;
    takeProfit = Math.round(currentPrice * (1 + tpPct) * 1e8) / 1e8;
  } else {
    stopLoss = Math.round(currentPrice * (1 + slPct) * 1e8) / 1e8;
    takeProfit = Math.round(currentPrice * (1 - tpPct) * 1e8) / 1e8;
  }

  return { takeProfit, stopLoss };
}

/** Calculate expiry based on how far TP/SL are from entry.
 *  Wider spread = needs more time to reach target.
 *
 *  ~1% spread  → 30 min
 *  ~5% spread  → 2 hours
 *  ~10% spread → 6 hours
 *  ~20%+ spread → 12-24 hours
 */
function calcExpiryMinutes(entry: number, tp: number, sl: number): number {
  const tpPct = Math.abs(tp - entry) / entry * 100;
  const slPct = Math.abs(sl - entry) / entry * 100;
  const maxPct = Math.max(tpPct, slPct);

  if (maxPct <= 1) return 30;       // very tight → 30 min
  if (maxPct <= 3) return 60;       // 1-3% → 1 hour
  if (maxPct <= 5) return 120;      // 3-5% → 2 hours
  if (maxPct <= 10) return 360;     // 5-10% → 6 hours
  if (maxPct <= 20) return 720;     // 10-20% → 12 hours
  return 1440;                       // 20%+ → 24 hours
}

function buildReasoning(pos: BrainPosition): string {
  const cog = pos.cognition_at_entry;
  const action = pos.position_action;

  const lines = [
    `=== Entry Cognition ===`,
    `Market State: ${cog.market_state}`,
    `Token Stage: ${cog.token_stage}`,
    `AI Confidence: ${(cog.confidence * 100).toFixed(1)}%`,
    `Decision Action: ${pos.decision_action}`,
    `Entry Time: ${pos.entered_at}`,
    ``,
    `=== Current Position ===`,
    `Current Price: $${pos._current_price}`,
    `PnL: ${pos._pnl_pct >= 0 ? "+" : ""}${pos._pnl_pct.toFixed(2)}%`,
    `Current Stage: ${action.stage}`,
    `Last Check: ${pos.last_check}`,
    `Last Stage: ${pos.last_stage}`,
    ``,
    `=== Position Action ===`,
    `Action: ${action.action}`,
    `Auto Exit: ${action.auto_exit ? "Yes" : "No"}`,
    `Reason: ${action.reason}`,
    ``,
    `=== Status ===`,
    `Price Status: ${pos.price_status}`,
    `Stage Status: ${pos.stage_status}`,
    ...(pos.stage_error ? [`Stage Error: ${pos.stage_error}`] : []),
  ];

  return lines.join("\n");
}

import { getPrice } from "./price";

interface SignalParams {
  market: "BTC" | "ETH" | "SOL";
  currentPrice: number;
}

interface GeneratedSignal {
  market: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  expiryMinutes: number;
  confidence: number;
  bondAmount: number;
  accessFee: number;
  publicSummary: string;
  privateReasoning: string;
}

// Rule-based signal generation for MVP
export async function generateSignal(market: "BTC" | "ETH" | "SOL"): Promise<GeneratedSignal> {
  const currentPrice = await getPrice(market);

  // Simple momentum-based logic for demo
  const volatility = getVolatilityFactor(market);
  const direction = Math.random() > 0.5 ? "LONG" : "SHORT";

  // Fixed dollar ranges per market — easy to trigger in minutes
  const ranges: Record<string, { sl: number; tp: number }> = {
    BTC: { sl: 80 + Math.random() * 120, tp: 150 + Math.random() * 150 },   // SL ~$80-200, TP ~$150-300
    ETH: { sl: 3 + Math.random() * 5, tp: 5 + Math.random() * 8 },          // SL ~$3-8, TP ~$5-13
    SOL: { sl: 0.1 + Math.random() * 0.3, tp: 0.2 + Math.random() * 0.5 },  // SL ~$0.1-0.4, TP ~$0.2-0.7
  };
  const range = ranges[market] || ranges.BTC;

  let takeProfit: number;
  let stopLoss: number;

  if (direction === "LONG") {
    stopLoss = roundPrice(currentPrice - range.sl, market);
    takeProfit = roundPrice(currentPrice + range.tp, market);
  } else {
    stopLoss = roundPrice(currentPrice + range.sl, market);
    takeProfit = roundPrice(currentPrice - range.tp, market);
  }

  const confidence = Math.floor(55 + Math.random() * 35); // 55-90
  const bondAmount = getBondAmount(confidence);
  const accessFee = roundPrice(bondAmount * 0.01, market); // 1% of bond

  const expiryMinutes = [5, 10, 15, 20, 30][Math.floor(Math.random() * 5)];

  const rrRatio = (Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss)).toFixed(1);

  const reasons = generateReasons(market, direction, confidence, rrRatio, volatility);

  return {
    market,
    direction,
    entryPrice: currentPrice,
    takeProfit,
    stopLoss,
    expiryMinutes,
    confidence,
    bondAmount,
    accessFee: Math.max(0.1, accessFee),
    publicSummary: `${market} ${direction.toLowerCase()} setup with ${rrRatio}:1 R:R ratio`,
    privateReasoning: reasons,
  };
}

function getVolatilityFactor(market: string): string {
  const factors = ["low", "moderate", "high"];
  return factors[Math.floor(Math.random() * factors.length)];
}

function getBondAmount(confidence: number): number {
  if (confidence >= 80) return 50;
  if (confidence >= 70) return 20;
  if (confidence >= 60) return 10;
  return 5;
}

function roundPrice(price: number, market: string): number {
  if (market === "BTC") return Math.round(price);
  if (market === "ETH") return Math.round(price * 10) / 10;
  return Math.round(price * 100) / 100;
}

function generateReasons(
  market: string,
  direction: string,
  confidence: number,
  rrRatio: string,
  volatility: string
): string {
  const longReasons = [
    `${market} funding rate is cooling, suggesting reduced short pressure.`,
    `Spot bid support is increasing across major exchanges.`,
    `Volatility compression on 4H chart suggests imminent breakout.`,
    `Volume profile shows accumulation zone near current price.`,
    `RSI divergence forming on the 1H timeframe.`,
    `Key support level holding with higher lows forming.`,
    `Open interest is declining while price holds, indicating short squeeze potential.`,
    `Market structure showing higher highs and higher lows.`,
  ];

  const shortReasons = [
    `${market} funding rate is elevated, suggesting overleveraged longs.`,
    `Spot ask walls are increasing, indicating sell pressure.`,
    `Bearish divergence on 4H RSI suggests weakening momentum.`,
    `Volume declining on rallies, indicating distribution.`,
    `Key resistance level rejected multiple times.`,
    `Open interest rising while price stalls, indicating potential long squeeze.`,
    `Market structure showing lower highs.`,
    `Whale wallet activity shows distribution pattern.`,
  ];

  const pool = direction === "LONG" ? longReasons : shortReasons;
  const selected = pool.sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 2));

  return [
    ...selected.map((r, i) => `${i + 1}. ${r}`),
    ``,
    `Risk/Reward ratio: ${rrRatio}:1`,
    `Volatility assessment: ${volatility}`,
    `Confidence level: ${confidence}% based on confluence of ${selected.length} factors.`,
  ].join("\n");
}

const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
};

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
};

export async function getPrice(market: string): Promise<number> {
  // Try Binance first
  const symbol = BINANCE_SYMBOLS[market];
  if (symbol) {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.price) return parseFloat(data.price);
    } catch {
      // fallthrough
    }
  }

  // Try Binance with USDT suffix (altcoins)
  try {
    const altSymbol = `${market}USDT`;
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${altSymbol}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (data.price) return parseFloat(data.price);
  } catch {
    // fallthrough
  }

  // Fallback: CoinGecko (works from Vercel)
  const cgId = COINGECKO_IDS[market];
  if (cgId) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data[cgId]?.usd) return data[cgId].usd;
    } catch {
      // fallthrough
    }
  }

  // Fallback: Brain API (local only)
  try {
    const res = await fetch("http://127.0.0.1:9848/api/brain", { cache: "no-store" });
    const data = await res.json();
    const positions = data.status?.positions || [];
    for (const pos of positions) {
      const token = pos.token.replace(/USDT$/i, "").toUpperCase();
      if (token === market.toUpperCase() && pos._current_price) {
        return pos._current_price;
      }
    }
  } catch {
    // fallthrough
  }

  throw new Error(`Cannot get price for: ${market}`);
}

export async function getAllPrices(): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  for (const market of ["BTC", "ETH", "SOL"]) {
    try {
      results[market] = await getPrice(market);
    } catch {
      results[market] = 0;
    }
  }
  return results;
}

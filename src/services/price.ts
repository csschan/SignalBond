const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
};

export async function getPrice(market: string): Promise<number> {
  // Try Binance first (BTC/ETH/SOL)
  const symbol = BINANCE_SYMBOLS[market];
  if (symbol) {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      return parseFloat(data.price);
    } catch {
      // fallthrough
    }
  }

  // Try Binance with USDT suffix (for altcoins)
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

  // Fallback: get from Brain API current prices
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
  const [btc, eth, sol] = await Promise.all([
    getPrice("BTC"),
    getPrice("ETH"),
    getPrice("SOL"),
  ]);
  return { BTC: btc, ETH: eth, SOL: sol };
}

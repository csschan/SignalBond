"use client";

import { useEffect, useState } from "react";

export default function PriceBar() {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch("/api/price");
        const data = await res.json();
        setPrices(data);
      } catch {
        // silently fail
      }
    }
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-6 text-sm">
      {Object.entries(prices).map(([market, price]) => (
        <div key={market} className="flex items-center gap-2">
          <span className="animate-pulse-dot w-1.5 h-1.5 rounded-full bg-success inline-block" />
          <span className="text-muted">{market}</span>
          <span className="text-white font-mono">
            ${Number(price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
}

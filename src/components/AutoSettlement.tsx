"use client";

import { useEffect, useRef } from "react";

const POLL_INTERVAL = 10_000; // 10 seconds — check frequently to catch TP/SL hits

export default function AutoSettlement() {
  const running = useRef(false);

  useEffect(() => {
    async function poll() {
      if (running.current) return;
      running.current = true;
      try {
        const res = await fetch("/api/settlement/auto");
        const data = await res.json();
        if (data.settled > 0) {
          console.log(`[AutoSettlement] Settled ${data.settled} signals:`, data.results);
        }
      } catch {
        // silent
      } finally {
        running.current = false;
      }
    }

    // Run immediately on mount, then every 30s
    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return null; // invisible component
}

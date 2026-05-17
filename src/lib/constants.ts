export const SUPPORTED_MARKETS = ["BTC", "ETH", "SOL"] as const;
export const DIRECTIONS = ["LONG", "SHORT"] as const;

export const SIGNAL_STATUS = {
  OPEN: "OPEN",
  ACTIVE: "ACTIVE",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  EXPIRED: "EXPIRED",
  SETTLED: "SETTLED",
  CANCELLED: "CANCELLED",
} as const;

export const SLASH_RATE = 0.2; // 20% of bond
export const SLASH_BUYER_SHARE = 0.5; // 50% of slash to buyers
export const SLASH_CHALLENGER_SHARE = 0.4; // 40% to challengers
export const SLASH_PROTOCOL_SHARE = 0.1; // 10% protocol fee

export const REPUTATION = {
  INITIAL: 100,
  SUCCESS_GAIN: 2,
  FAILURE_LOSS: 3,
  CONSECUTIVE_FAIL_PENALTY: 5,
  CONSECUTIVE_FAIL_THRESHOLD: 3,
  HIGH_BOND_BONUS_THRESHOLD: 50,
  HIGH_BOND_SUCCESS_BONUS: 3,
};

export const EXPIRED_ACCESS_FEE_REFUND_RATE = 0.5;

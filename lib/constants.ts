/**
 * Bitcoin genesis block date: January 3, 2009
 * This is when Bitcoin was created
 */
export const BITCOIN_BIRTH_DATE = "2009-01-03";

export const TIMEFRAMES = ["1d", "1w", "1m"] as const;

export const TIMEFRAME_LABELS: Record<(typeof TIMEFRAMES)[number], string> = {
  "1d": "1 Day",
  "1w": "1 Week",
  "1m": "1 Month",
};

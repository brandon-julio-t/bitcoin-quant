/**
 * Bitcoin genesis block date: January 3, 2009
 * This is when Bitcoin was created
 */
export const BITCOIN_BIRTH_DATE = "2009-01-03";

export const TIMEFRAMES = ["1d", "1w", "1m"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const TIMEFRAME_LABELS: Record<(typeof TIMEFRAMES)[number], string> = {
  "1d": "1 Day",
  "1w": "1 Week",
  "1m": "1 Month",
};

// Number of days to focus on for each timeframe's initial viewport
export const TIMEFRAME_FOCUS_WINDOWS_DAYS: Record<Timeframe, number> = {
  "1d": 365 * 1, // 1 year
  "1w": 365 * 2, // 2 year
  "1m": 365 * 5, // 5 years
};

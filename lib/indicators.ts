/**
 * Technical indicator calculations
 */

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type OrderBlockType = "buy" | "sell";

export interface OrderBlockZone {
  type: OrderBlockType;
  /**
   * Index of the source candle that defines the zone.
   */
  startIndex: number;
  /**
   * Index of the candle that invalidates the zone (or the last candle if still valid).
   */
  endIndex: number;
  startTime: string;
  endTime: string;
  low: number;
  high: number;
}

interface OrderBlockSettings {
  /**
   * Number of candles on each side required to confirm a swing high/low.
   */
  swingLookback: number;
  /**
   * Minimum percentage break of the prior swing to confirm structure shift.
   */
  minimumBreakoutPercent: number;
  /**
   * Maximum bars to look back from a break to find the last opposite candle.
   */
  maxSourceLookback: number;
}

const DEFAULT_ORDER_BLOCK_SETTINGS: OrderBlockSettings = {
  swingLookback: 3,
  minimumBreakoutPercent: 0.0015, // 0.15%
  maxSourceLookback: 15,
};

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA for first value
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  if (data.length >= period) {
    ema.push(sum / period);
  }

  // Calculate EMA for remaining values
  for (let i = period; i < data.length; i++) {
    const value =
      (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(value);
  }

  // Pad beginning with null values
  return [...Array(Math.max(0, period - 1)).fill(NaN), ...ema];
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  data: number[],
  period: number = 20,
  stdDev: number = 2.0
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle: number[] = [];
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      middle.push(NaN);
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }

    // Calculate SMA (middle band)
    const slice = data.slice(i - period + 1, i + 1);
    const sma = slice.reduce((sum, val) => sum + val, 0) / period;
    middle.push(sma);

    // Calculate standard deviation
    const variance =
      slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
    const sd = Math.sqrt(variance);

    upper.push(sma + stdDev * sd);
    lower.push(sma - stdDev * sd);
  }

  return { upper, middle, lower };
}

/**
 * Calculate Stochastic Oscillator
 */
export function calculateStochastic(
  high: number[],
  low: number[],
  close: number[],
  kPeriod: number = 5,
  dPeriod: number = 3,
  smoothK: number = 3
): { k: number[]; d: number[] } {
  const k: number[] = [];
  const d: number[] = [];

  // Calculate %K
  for (let i = 0; i < close.length; i++) {
    if (i < kPeriod - 1) {
      k.push(NaN);
      continue;
    }

    const highSlice = high.slice(i - kPeriod + 1, i + 1);
    const lowSlice = low.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...highSlice);
    const lowestLow = Math.min(...lowSlice);

    if (highestHigh === lowestLow) {
      k.push(50); // Avoid division by zero
    } else {
      const stochK = ((close[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      k.push(stochK);
    }
  }

  // Smooth %K (if smoothK > 1)
  let smoothedK = k;
  if (smoothK > 1) {
    smoothedK = [];
    for (let i = 0; i < k.length; i++) {
      if (i < smoothK - 1) {
        smoothedK.push(NaN);
        continue;
      }
      const slice = k.slice(i - smoothK + 1, i + 1).filter((v) => !isNaN(v));
      smoothedK.push(slice.reduce((sum, val) => sum + val, 0) / slice.length);
    }
  }

  // Calculate %D (moving average of %K)
  for (let i = 0; i < smoothedK.length; i++) {
    if (i < dPeriod - 1) {
      d.push(NaN);
      continue;
    }
    const slice = smoothedK
      .slice(i - dPeriod + 1, i + 1)
      .filter((v) => !isNaN(v));
    d.push(slice.reduce((sum, val) => sum + val, 0) / slice.length);
  }

  return { k: smoothedK, d };
}

/**
 * Detect buy/sell order blocks using a simplified LuxAlgo-style BOS approach.
 *
 * The logic:
 * - Identify swing highs/lows using a symmetric lookback window.
 * - Confirm a break of structure (BOS) once price closes beyond the prior swing
 *   by at least `minimumBreakoutPercent`.
 * - Mark the last opposite candle before the BOS as the order block origin.
 * - Extend the zone forward until an invalidation close pierces the extreme.
 */
export function calculateOrderBlocks(
  data: OHLCV[],
  settings: OrderBlockSettings = DEFAULT_ORDER_BLOCK_SETTINGS
): OrderBlockZone[] {
  if (!data.length) {
    return [];
  }

  const zones: OrderBlockZone[] = [];
  const { swingLookback, minimumBreakoutPercent, maxSourceLookback } = settings;

  const isSwingHigh = (index: number) => {
    if (index < swingLookback || index > data.length - swingLookback - 1) {
      return false;
    }
    const window = data.slice(index - swingLookback, index + swingLookback + 1);
    const targetHigh = data[index].high;
    return window.every(
      (bar, idx) => idx === swingLookback || targetHigh >= bar.high
    );
  };

  const isSwingLow = (index: number) => {
    if (index < swingLookback || index > data.length - swingLookback - 1) {
      return false;
    }
    const window = data.slice(index - swingLookback, index + swingLookback + 1);
    const targetLow = data[index].low;
    return window.every(
      (bar, idx) => idx === swingLookback || targetLow <= bar.low
    );
  };

  const findSourceCandle = (breakIndex: number, type: OrderBlockType) => {
    const start = Math.max(0, breakIndex - maxSourceLookback);
    for (let i = breakIndex - 1; i >= start; i -= 1) {
      const bar = data[i];
      const isOpposite =
        type === "buy" ? bar.close < bar.open : bar.close > bar.open;
      if (isOpposite) {
        return i;
      }
    }
    return Math.max(0, breakIndex - 1);
  };

  const findInvalidationIndex = (
    sourceIndex: number,
    zoneLow: number,
    zoneHigh: number,
    type: OrderBlockType
  ) => {
    for (let i = sourceIndex + 1; i < data.length; i += 1) {
      const bar = data[i];
      const isInvalidated =
        type === "buy" ? bar.close < zoneLow : bar.close > zoneHigh;
      if (isInvalidated) {
        return i;
      }
    }
    return data.length - 1;
  };

  let lastSwingHighIndex: number | null = null;
  let lastSwingLowIndex: number | null = null;

  for (let i = 0; i < data.length; i += 1) {
    if (isSwingHigh(i)) {
      lastSwingHighIndex = i;
    }
    if (isSwingLow(i)) {
      lastSwingLowIndex = i;
    }

    const bar = data[i];

    if (lastSwingHighIndex !== null) {
      const swingHigh = data[lastSwingHighIndex];
      const breakPct = (bar.close - swingHigh.high) / swingHigh.high;
      const brokeUp =
        breakPct >= minimumBreakoutPercent && bar.close > swingHigh.high;
      if (brokeUp) {
        const sourceIndex = findSourceCandle(i, "buy");
        const sourceBar = data[sourceIndex];
        const zoneLow = sourceBar.low;
        const zoneHigh = sourceBar.open;
        const endIndex = findInvalidationIndex(
          sourceIndex,
          zoneLow,
          zoneHigh,
          "buy"
        );
        zones.push({
          type: "buy",
          startIndex: sourceIndex,
          endIndex,
          startTime: data[sourceIndex].date,
          endTime: data[endIndex].date,
          low: Math.min(zoneLow, zoneHigh),
          high: Math.max(zoneLow, zoneHigh),
        });
        lastSwingHighIndex = null;
      }
    }

    if (lastSwingLowIndex !== null) {
      const swingLow = data[lastSwingLowIndex];
      const breakPct = (swingLow.low - bar.close) / swingLow.low;
      const brokeDown =
        breakPct >= minimumBreakoutPercent && bar.close < swingLow.low;
      if (brokeDown) {
        const sourceIndex = findSourceCandle(i, "sell");
        const sourceBar = data[sourceIndex];
        const zoneLow = sourceBar.open;
        const zoneHigh = sourceBar.high;
        const endIndex = findInvalidationIndex(
          sourceIndex,
          zoneLow,
          zoneHigh,
          "sell"
        );
        zones.push({
          type: "sell",
          startIndex: sourceIndex,
          endIndex,
          startTime: data[sourceIndex].date,
          endTime: data[endIndex].date,
          low: Math.min(zoneLow, zoneHigh),
          high: Math.max(zoneLow, zoneHigh),
        });
        lastSwingLowIndex = null;
      }
    }
  }

  return zones;
}

/**
 * Calculate all indicators for a dataset
 */
export function calculateAllIndicators(data: OHLCV[]) {
  const close = data.map((d) => d.close);
  const high = data.map((d) => d.high);
  const low = data.map((d) => d.low);

  return {
    ema13: calculateEMA(close, 13),
    ema21: calculateEMA(close, 21),
    ema50: calculateEMA(close, 50),
    ema100: calculateEMA(close, 100),
    bollinger: calculateBollingerBands(close, 20, 2.0),
    stochastic: calculateStochastic(high, low, close, 5, 3, 3),
    orderBlocks: calculateOrderBlocks(data),
  };
}

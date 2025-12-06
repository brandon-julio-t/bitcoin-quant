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
  };
}

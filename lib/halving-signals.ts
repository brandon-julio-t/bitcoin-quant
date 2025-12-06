/**
 * Bitcoin halving dates and signal calculations
 */

export interface HalvingSignals {
  halvings: Date[];
  topSignals: Date[];
  bottomSignals: Date[];
}

/**
 * Get Bitcoin halving dates and calculate top/bottom signals
 */
export function getBitcoinHalvingSignals(): HalvingSignals {
  // Bitcoin halving dates
  const halvingDates = [
    new Date(2012, 10, 28), // November 28, 2012 (month is 0-indexed)
    new Date(2016, 6, 9), // July 9, 2016
    new Date(2020, 4, 11), // May 11, 2020
    new Date(2024, 3, 20), // April 20, 2024
  ];

  const topSignals: Date[] = [];
  const bottomSignals: Date[] = [];

  halvingDates.forEach((halvingDate) => {
    // Top signal: 518 days (17 months) after halving
    const topSignal = new Date(halvingDate);
    topSignal.setDate(topSignal.getDate() + 518);
    topSignals.push(topSignal);

    // Bottom signal: 883 days (29 months) after halving
    const bottomSignal = new Date(halvingDate);
    bottomSignal.setDate(bottomSignal.getDate() + 883);
    bottomSignals.push(bottomSignal);
  });

  return {
    halvings: halvingDates,
    topSignals,
    bottomSignals,
  };
}

/**
 * Find the nearest data point timestamp to a target date
 */
export function findNearestCandlestick(
  targetDate: Date,
  dataDates: string[]
): string {
  const targetTime = targetDate.getTime();
  let nearestDate = dataDates[0];
  let minDiff = Math.abs(new Date(dataDates[0]).getTime() - targetTime);

  for (const dateStr of dataDates) {
    const diff = Math.abs(new Date(dateStr).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      nearestDate = dateStr;
    }
  }

  return nearestDate;
}

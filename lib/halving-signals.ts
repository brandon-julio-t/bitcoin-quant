/**
 * Bitcoin halving dates and signal calculations
 */

export interface HalvingSignals {
  halvings: Date[];
  topSignals: Date[];
  bottomSignals: Date[];
}

/**
 * Calculate top and bottom signals from halving dates
 *
 * @param halvingDates - Array of halving dates (from API)
 * @returns HalvingSignals with halvings, topSignals, and bottomSignals
 */
export function calculateHalvingSignals(halvingDates: Date[]): HalvingSignals {
  const topSignals: Date[] = [];
  const bottomSignals: Date[] = [];

  halvingDates.forEach((halvingDate) => {
    // Top signal: 17 months since halving month (~518 days)
    const topSignal = new Date(halvingDate);
    topSignal.setMonth(topSignal.getMonth() + 17);
    topSignals.push(topSignal);

    // Bottom signal: 29 months since halving month (~883 days)
    const bottomSignal = new Date(halvingDate);
    bottomSignal.setMonth(bottomSignal.getMonth() + 29);
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

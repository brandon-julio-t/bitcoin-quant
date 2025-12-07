"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Timeframe } from "@/lib/constants";
import { calculateHalvingSignals } from "@/lib/halving-signals";
import { OHLCV, OrderBlockZone } from "@/lib/indicators";
import { format } from "date-fns";
import { IChartApi, ISeriesApi } from "lightweight-charts";
import { useMemo, useRef } from "react";
import { useIsClient, useScreen } from "usehooks-ts";
import CandlestickChart from "./CandlestickChart";

interface BitcoinChartProps {
  data: OHLCV[];
  indicators: {
    ema13: number[];
    ema21: number[];
    ema50: number[];
    ema100: number[];
    bollinger: {
      upper: number[];
      middle: number[];
      lower: number[];
    };
    stochastic: {
      k: number[];
      d: number[];
    };
    orderBlocks: OrderBlockZone[];
  };
  halvingDates?: string[];
  isLoadingHalvingDates?: boolean;
  halvingDatesError?: Error | null;
  fearGreedData?: Map<string, { value: number; classification: string }>;
  timeframe: Timeframe;
}

/**
 * BitcoinChart component that displays candlestick chart with indicators
 * and stochastic oscillator using panes
 */
export default function BitcoinChart({
  data,
  indicators,
  halvingDates,
  isLoadingHalvingDates = false,
  halvingDatesError,
  fearGreedData,
  timeframe,
}: BitcoinChartProps) {
  const btcChartRef = useRef<IChartApi | null>(null);
  const btcCandlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(
    null
  );

  const chartData = useMemo(() => {
    if (!data.length) return [];
    if (!halvingDates || halvingDates.length === 0) return [];

    const dates = data.map((d) => d.date);
    // Convert string dates to Date objects and calculate signals
    const halvingDatesArray = halvingDates.map((dateStr) => new Date(dateStr));
    const signals = calculateHalvingSignals(halvingDatesArray);
    const dateRangeStart = new Date(dates[0]);
    const dateRangeEnd = new Date(dates[dates.length - 1]);

    // Helper function to find the nearest candlestick date for a signal
    const findNearestCandlestickDate = (targetDate: Date): Date | null => {
      if (!data.length) return null;

      let nearestDate = new Date(data[0].date);
      let minDiff = Math.abs(
        new Date(data[0].date).getTime() - targetDate.getTime()
      );

      for (const point of data) {
        const pointDate = new Date(point.date);
        const diff = Math.abs(pointDate.getTime() - targetDate.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          nearestDate = pointDate;
        }
      }

      return nearestDate;
    };

    // Create sets of signal dates for quick lookup
    const halvingDateKeys = new Set<string>();
    const topSignalDates = new Set<string>();
    const bottomSignalDates = new Set<string>();
    const halvingLabels = new Map<string, string>();
    const topSignalLabels = new Map<string, string>();
    const bottomSignalLabels = new Map<string, string>();

    // Process halving dates
    signals.halvings.forEach((halvingDate, i) => {
      if (halvingDate >= dateRangeStart && halvingDate <= dateRangeEnd) {
        const nearestDate = findNearestCandlestickDate(halvingDate);
        if (nearestDate) {
          const dateKey = nearestDate.toISOString();
          halvingDateKeys.add(dateKey);
          halvingLabels.set(dateKey, `Halving ${i + 1}`);
        }
      }
    });

    // Process top signals
    signals.topSignals.forEach((topSignal) => {
      if (topSignal >= dateRangeStart && topSignal <= dateRangeEnd) {
        const nearestDate = findNearestCandlestickDate(topSignal);
        if (nearestDate) {
          const dateKey = nearestDate.toISOString();
          topSignalDates.add(dateKey);
          topSignalLabels.set(dateKey, "Top");
        }
      }
    });

    // Process bottom signals
    signals.bottomSignals.forEach((bottomSignal) => {
      if (bottomSignal >= dateRangeStart && bottomSignal <= dateRangeEnd) {
        const nearestDate = findNearestCandlestickDate(bottomSignal);
        if (nearestDate) {
          const dateKey = nearestDate.toISOString();
          bottomSignalDates.add(dateKey);
          bottomSignalLabels.set(dateKey, "Bottom");
        }
      }
    });

    // Prepare data points with all indicators and signal flags
    return data.map((point, index) => {
      const pointDate = new Date(point.date);
      const dateKey = pointDate.toISOString();
      const dateKeyNormalized = pointDate.toISOString().split("T")[0]; // YYYY-MM-DD format
      const isHalving = halvingDateKeys.has(dateKey);
      const isTopSignal = topSignalDates.has(dateKey);
      const isBottomSignal = bottomSignalDates.has(dateKey);

      // Get Fear and Greed data for this date
      const fearGreedPoint = fearGreedData?.get(dateKeyNormalized);

      return {
        date: dateKey,
        dateLabel: format(pointDate, "d MMM yyyy"),
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume,
        ema13: indicators.ema13[index] || null,
        ema21: indicators.ema21[index] || null,
        ema50: indicators.ema50[index] || null,
        ema100: indicators.ema100[index] || null,
        bbUpper: indicators.bollinger.upper[index] || null,
        bbMiddle: indicators.bollinger.middle[index] || null,
        bbLower: indicators.bollinger.lower[index] || null,
        stochasticK: indicators.stochastic.k[index] || null,
        stochasticD: indicators.stochastic.d[index] || null,
        fearGreedValue: fearGreedPoint?.value || null,
        fearGreedClassification: fearGreedPoint?.classification || undefined,
        // Signal flags
        isHalving,
        isTopSignal,
        isBottomSignal,
        halvingLabel: isHalving ? halvingLabels.get(dateKey) : undefined,
        topSignalLabel: isTopSignal ? topSignalLabels.get(dateKey) : undefined,
        bottomSignalLabel: isBottomSignal
          ? bottomSignalLabels.get(dateKey)
          : undefined,
      };
    });
  }, [data, indicators, halvingDates, fearGreedData]);

  const orderBlocks = indicators.orderBlocks || [];

  const screen = useScreen();
  const isClient = useIsClient();

  if (halvingDatesError) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Error loading halving dates</EmptyTitle>
          <EmptyDescription>
            Failed to fetch Bitcoin halving dates. Please try again later.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (isLoadingHalvingDates || !chartData.length) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia>
            <Spinner />
          </EmptyMedia>
          <EmptyTitle>Loading chart</EmptyTitle>
          <EmptyDescription>
            {isLoadingHalvingDates
              ? "Fetching halving dates..."
              : "Preparing chart data..."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!screen || !isClient) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia>
            <Spinner />
          </EmptyMedia>
          <EmptyTitle>Loading UI</EmptyTitle>
          <EmptyDescription>Loading UI...</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <CandlestickChart
      data={chartData}
      orderBlocks={orderBlocks}
      timeframe={timeframe}
      chartHeight={screen.availHeight - 250}
      onChartReady={(chart) => {
        btcChartRef.current = chart;
      }}
      onSeriesReady={(series) => {
        btcCandlestickSeriesRef.current = series;
      }}
    />
  );
}

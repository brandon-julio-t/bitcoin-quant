"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { calculateHalvingSignals } from "@/lib/halving-signals";
import { OHLCV } from "@/lib/indicators";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ColorType,
  createChart,
  IChartApi,
  IRange,
  ISeriesApi,
  LineData,
  LineSeries,
  MouseEventParams,
  Time,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, type RefObject } from "react";
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
  };
}

/**
 * Stochastic Oscillator Chart component using TradingView Lightweight Charts
 */
function StochasticChart({
  data,
  btcChartRef,
  onChartReady,
  onSeriesReady,
}: {
  data: Array<{
    date: string;
    dateLabel: string;
    stochasticK: number | null;
    stochasticD: number | null;
  }>;
  btcChartRef?: RefObject<IChartApi | null>;
  onChartReady?: (chart: IChartApi) => void;
  onSeriesReady?: (series: ISeriesApi<"Line">) => void;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const kSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const dSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const overboughtLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const oversoldLineRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart instance
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#ffffff",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.1)" },
        horzLines: { color: "rgba(255, 255, 255, 0.1)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 200,
      rightPriceScale: {
        borderColor: "#ffffff",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        visible: true,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: "#ffffff",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1, // Normal mode
      },
    });

    chartRef.current = chart;

    // Configure price scale
    chart.priceScale("right").applyOptions({
      autoScale: false,
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    });

    // Create horizontal reference lines
    const overboughtLine = chart.addSeries(LineSeries, {
      color: "#ef5350",
      lineWidth: 1,
      lineStyle: 1, // Dashed
      title: "",
      priceFormat: {
        type: "price",
        precision: 0,
        minMove: 1,
      },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    overboughtLineRef.current = overboughtLine;

    const oversoldLine = chart.addSeries(LineSeries, {
      color: "#26a69a",
      lineWidth: 1,
      lineStyle: 1, // Dashed
      title: "",
      priceFormat: {
        type: "price",
        precision: 0,
        minMove: 1,
      },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    oversoldLineRef.current = oversoldLine;

    // Create %K series
    const kSeries = chart.addSeries(LineSeries, {
      color: "rgba(33, 150, 243, 1)",
      lineWidth: 1,
      title: "",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    kSeriesRef.current = kSeries;

    // Notify parent component that chart and series are ready
    if (onChartReady) {
      onChartReady(chart);
    }
    if (onSeriesReady) {
      onSeriesReady(kSeries);
    }

    // Create %D series
    const dSeries = chart.addSeries(LineSeries, {
      color: "rgba(255, 152, 0, 1)",
      lineWidth: 1,
      title: "",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    dSeriesRef.current = dSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update chart data when data prop changes
  useEffect(() => {
    if (!data.length || !chartRef.current) return;

    // Convert data to TradingView format
    const kData: LineData<Time>[] = [];
    const dData: LineData<Time>[] = [];
    const overboughtData: LineData<Time>[] = [];
    const oversoldData: LineData<Time>[] = [];

    data.forEach((point) => {
      const timestamp = Math.floor(
        new Date(point.date).getTime() / 1000
      ) as Time;

      if (point.stochasticK !== null) {
        kData.push({ time: timestamp, value: point.stochasticK });
      }
      if (point.stochasticD !== null) {
        dData.push({ time: timestamp, value: point.stochasticD });
      }

      // Reference lines
      overboughtData.push({ time: timestamp, value: 80 });
      oversoldData.push({ time: timestamp, value: 20 });
    });

    // Set data to series
    kSeriesRef.current?.setData(kData);
    dSeriesRef.current?.setData(dData);
    overboughtLineRef.current?.setData(overboughtData);
    oversoldLineRef.current?.setData(oversoldData);

    // Fit content
    chartRef.current.timeScale().fitContent();
  }, [data]);

  // Synchronize time scale bidirectionally between BTC and Stochastic charts
  useEffect(() => {
    if (!btcChartRef?.current || !chartRef.current) return;

    const btcChart = btcChartRef.current;
    const stochasticChart = chartRef.current;
    const isSyncingFromBtcRef = { current: false }; // Prevent loop when syncing from BTC
    const isSyncingFromStochasticRef = { current: false }; // Prevent loop when syncing from Stochastic

    // Handler for BTC chart time range changes -> sync to Stochastic
    const handleBtcTimeRangeChange = (timeRange: IRange<Time> | null) => {
      if (
        timeRange &&
        !isSyncingFromBtcRef.current &&
        !isSyncingFromStochasticRef.current
      ) {
        isSyncingFromBtcRef.current = true;
        try {
          // Get current stochastic chart time range to avoid unnecessary updates
          const currentRange = stochasticChart.timeScale().getVisibleRange();
          if (
            !currentRange ||
            currentRange.from !== timeRange.from ||
            currentRange.to !== timeRange.to
          ) {
            // Sync the stochastic chart's visible time range with BTC chart
            if (timeRange.to !== null) {
              stochasticChart.timeScale().setVisibleRange({
                from: timeRange.from,
                to: timeRange.to,
              });
            } else {
              // If to is null, use fitContent
              stochasticChart.timeScale().fitContent();
            }
          }
        } finally {
          // Reset flag after a short delay to allow the change to propagate
          window.setTimeout(() => {
            isSyncingFromBtcRef.current = false;
          }, 10);
        }
      }
    };

    // Handler for Stochastic chart time range changes -> sync to BTC
    const handleStochasticTimeRangeChange = (
      timeRange: IRange<Time> | null
    ) => {
      if (
        timeRange &&
        !isSyncingFromStochasticRef.current &&
        !isSyncingFromBtcRef.current
      ) {
        isSyncingFromStochasticRef.current = true;
        try {
          // Get current BTC chart time range to avoid unnecessary updates
          const currentRange = btcChart.timeScale().getVisibleRange();
          if (
            !currentRange ||
            currentRange.from !== timeRange.from ||
            currentRange.to !== timeRange.to
          ) {
            // Sync the BTC chart's visible time range with Stochastic chart
            if (timeRange.to !== null) {
              btcChart.timeScale().setVisibleRange({
                from: timeRange.from,
                to: timeRange.to,
              });
            } else {
              // If to is null, use fitContent
              btcChart.timeScale().fitContent();
            }
          }
        } finally {
          // Reset flag after a short delay to allow the change to propagate
          window.setTimeout(() => {
            isSyncingFromStochasticRef.current = false;
          }, 10);
        }
      }
    };

    // Subscribe to both charts' visible time range changes
    btcChart
      .timeScale()
      .subscribeVisibleTimeRangeChange(handleBtcTimeRangeChange);
    stochasticChart
      .timeScale()
      .subscribeVisibleTimeRangeChange(handleStochasticTimeRangeChange);

    // Cleanup subscriptions on unmount
    return () => {
      btcChart
        .timeScale()
        .unsubscribeVisibleTimeRangeChange(handleBtcTimeRangeChange);
      stochasticChart
        .timeScale()
        .unsubscribeVisibleTimeRangeChange(handleStochasticTimeRangeChange);
    };
  }, [btcChartRef]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full"
      style={{ height: "200px" }}
    />
  );
}

/**
 * BitcoinChart component that displays candlestick chart with indicators
 * and stochastic oscillator
 */
export default function BitcoinChart({ data, indicators }: BitcoinChartProps) {
  const btcChartRef = useRef<IChartApi | null>(null);
  const stochasticChartRef = useRef<IChartApi | null>(null);
  const btcCandlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(
    null
  );
  const stochasticKSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // Fetch halving dates from API
  const {
    data: halvingDatesData,
    isLoading: isLoadingHalvingDates,
    error: halvingDatesError,
  } = useQuery<{ halvingDates: string[] }>({
    queryKey: ["halving-dates"],
    queryFn: async () => {
      const response = await fetch("/api/halving-dates");
      if (!response.ok) {
        throw new Error("Failed to fetch halving dates");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - halving dates don't change often
  });

  const chartData = useMemo(() => {
    if (!data.length) return [];
    if (!halvingDatesData?.halvingDates) return [];

    const dates = data.map((d) => d.date);
    // Convert string dates to Date objects and calculate signals
    const halvingDatesArray = halvingDatesData.halvingDates.map(
      (dateStr) => new Date(dateStr)
    );
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
      const isHalving = halvingDateKeys.has(dateKey);
      const isTopSignal = topSignalDates.has(dateKey);
      const isBottomSignal = bottomSignalDates.has(dateKey);

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
  }, [data, indicators, halvingDatesData]);

  // Synchronize crosshair between BTC and Stochastic charts
  useEffect(() => {
    if (
      !btcChartRef.current ||
      !stochasticChartRef.current ||
      !btcCandlestickSeriesRef.current ||
      !stochasticKSeriesRef.current
    ) {
      return;
    }

    const btcChart = btcChartRef.current;
    const stochasticChart = stochasticChartRef.current;
    const btcSeries = btcCandlestickSeriesRef.current;
    const stochasticSeries = stochasticKSeriesRef.current;
    const isSyncingRef = { current: false };

    // Handler for BTC chart crosshair move
    const handleBtcCrosshairMove = (param: MouseEventParams) => {
      if (isSyncingRef.current || !param.time) return;

      isSyncingRef.current = true;
      try {
        // Get price from stochastic series at the same time
        const stochasticData = param.seriesData.get(stochasticSeries);
        let stochasticPrice: number | null = null;

        if (stochasticData) {
          const data = stochasticData as unknown;
          if (
            typeof data === "object" &&
            data !== null &&
            "value" in data &&
            typeof (data as { value: unknown }).value === "number"
          ) {
            stochasticPrice = (data as { value: number }).value;
          }
        }

        if (stochasticPrice !== null) {
          // Set crosshair on stochastic chart at the same time
          stochasticChart.setCrosshairPosition(
            stochasticPrice,
            param.time,
            stochasticSeries
          );
        } else {
          // If no price data, still set the time position (price will be auto-calculated)
          stochasticChart.setCrosshairPosition(0, param.time, stochasticSeries);
        }
      } finally {
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 0);
      }
    };

    // Handler for Stochastic chart crosshair move
    const handleStochasticCrosshairMove = (param: MouseEventParams) => {
      if (isSyncingRef.current || !param.time) return;

      isSyncingRef.current = true;
      try {
        // Get price from BTC candlestick series at the same time
        const btcData = param.seriesData.get(btcSeries);
        let btcPrice: number | null = null;

        if (btcData) {
          const data = btcData as unknown;
          if (
            typeof data === "object" &&
            data !== null &&
            "close" in data &&
            typeof (data as { close: unknown }).close === "number"
          ) {
            btcPrice = (data as { close: number }).close;
          }
        }

        if (btcPrice !== null) {
          // Set crosshair on BTC chart at the same time
          btcChart.setCrosshairPosition(btcPrice, param.time, btcSeries);
        } else {
          // If no price data, still set the time position (price will be auto-calculated)
          btcChart.setCrosshairPosition(0, param.time, btcSeries);
        }
      } finally {
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 0);
      }
    };

    // Subscribe to crosshair movements
    btcChart.subscribeCrosshairMove(handleBtcCrosshairMove);
    stochasticChart.subscribeCrosshairMove(handleStochasticCrosshairMove);

    // Note: Lightweight Charts doesn't have a direct "crosshair leave" event,
    // but clearing happens automatically when the crosshair moves outside the chart area

    // Cleanup subscriptions
    return () => {
      btcChart.unsubscribeCrosshairMove(handleBtcCrosshairMove);
      stochasticChart.unsubscribeCrosshairMove(handleStochasticCrosshairMove);
    };
  }, []);

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

  return (
    <div className="space-y-4">
      {/* Main Price Chart */}
      <div className="bg-card rounded-lg p-4 border space-y-6">
        <h2 className="text-xl font-bold text-card-foreground mb-4 text-center">
          Bitcoin (BTC-USD)
        </h2>
        <CandlestickChart
          data={chartData}
          onChartReady={(chart) => {
            btcChartRef.current = chart;
          }}
          onSeriesReady={(series) => {
            btcCandlestickSeriesRef.current = series;
          }}
        />

        {/* Stochastic Oscillator */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-2 text-center">
            Stochastic Oscillator
          </h3>
          <StochasticChart
            data={chartData}
            btcChartRef={btcChartRef}
            onChartReady={(chart) => {
              stochasticChartRef.current = chart;
            }}
            onSeriesReady={(series) => {
              stochasticKSeriesRef.current = series;
            }}
          />
        </div>
      </div>
    </div>
  );
}

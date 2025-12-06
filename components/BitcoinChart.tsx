"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { getBitcoinHalvingSignals } from "@/lib/halving-signals";
import { OHLCV } from "@/lib/indicators";
import { format } from "date-fns";
import {
  ColorType,
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  LineSeries,
  Time,
} from "lightweight-charts";
import { useEffect, useMemo, useRef } from "react";
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
}: {
  data: Array<{
    date: string;
    dateLabel: string;
    stochasticK: number | null;
    stochasticD: number | null;
  }>;
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
      priceFormat: {
        type: "price",
        precision: 0,
        minMove: 1,
      },
    });
    overboughtLineRef.current = overboughtLine;

    const oversoldLine = chart.addSeries(LineSeries, {
      color: "#26a69a",
      lineWidth: 1,
      lineStyle: 1, // Dashed
      priceFormat: {
        type: "price",
        precision: 0,
        minMove: 1,
      },
    });
    oversoldLineRef.current = oversoldLine;

    // Create %K series
    const kSeries = chart.addSeries(LineSeries, {
      color: "rgba(33, 150, 243, 1)",
      lineWidth: 1,
      title: "%K",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });
    kSeriesRef.current = kSeries;

    // Create %D series
    const dSeries = chart.addSeries(LineSeries, {
      color: "rgba(255, 152, 0, 1)",
      lineWidth: 1,
      title: "%D",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
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
  const chartData = useMemo(() => {
    if (!data.length) return [];

    const dates = data.map((d) => d.date);
    const signals = getBitcoinHalvingSignals();
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
    const halvingDates = new Set<string>();
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
          halvingDates.add(dateKey);
          halvingLabels.set(dateKey, `Halving ${i + 1}`);
        }
      }
    });

    // Process top signals
    signals.topSignals.forEach((topSignal, i) => {
      if (topSignal >= dateRangeStart && topSignal <= dateRangeEnd) {
        const nearestDate = findNearestCandlestickDate(topSignal);
        if (nearestDate) {
          const dateKey = nearestDate.toISOString();
          topSignalDates.add(dateKey);
          topSignalLabels.set(dateKey, `Top ${i + 1}`);
        }
      }
    });

    // Process bottom signals
    signals.bottomSignals.forEach((bottomSignal, i) => {
      if (bottomSignal >= dateRangeStart && bottomSignal <= dateRangeEnd) {
        const nearestDate = findNearestCandlestickDate(bottomSignal);
        if (nearestDate) {
          const dateKey = nearestDate.toISOString();
          bottomSignalDates.add(dateKey);
          bottomSignalLabels.set(dateKey, `Bottom ${i + 1}`);
        }
      }
    });

    // Prepare data points with all indicators and signal flags
    return data.map((point, index) => {
      const pointDate = new Date(point.date);
      const dateKey = pointDate.toISOString();
      const isHalving = halvingDates.has(dateKey);
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
  }, [data, indicators]);

  if (!chartData.length) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia>
            <Spinner />
          </EmptyMedia>
          <EmptyTitle>Loading chart</EmptyTitle>
          <EmptyDescription>Preparing chart data...</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const priceMin = Math.min(...data.map((d) => d.low));
  const priceMax = Math.max(...data.map((d) => d.high));

  return (
    <div className="space-y-4">
      {/* Main Price Chart */}
      <div className="bg-card rounded-lg p-4 border space-y-6">
        <h2 className="text-xl font-bold text-card-foreground mb-4 text-center">
          Bitcoin (BTC-USD)
        </h2>
        <CandlestickChart
          data={chartData}
          priceMin={priceMin}
          priceMax={priceMax}
        />

        {/* Stochastic Oscillator */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-2 text-center">
            Stochastic Oscillator
          </h3>
          <StochasticChart data={chartData} />
        </div>
      </div>
    </div>
  );
}

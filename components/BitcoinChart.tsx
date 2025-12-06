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
import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 255, 255, 0.1)"
            />
            <XAxis
              dataKey="dateLabel"
              stroke="#ffffff"
              tick={{ fill: "#ffffff" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#ffffff"
              tick={{ fill: "#ffffff" }}
              tickFormatter={(value) => value.toLocaleString()}
              label={{
                value: "Stochastic %",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#ffffff" },
              }}
            />
            <ReferenceLine y={80} stroke="#ef5350" strokeDasharray="3 3" />
            <ReferenceLine y={20} stroke="#26a69a" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                color: "#ffffff",
              }}
              labelStyle={{ color: "#9ca3af" }}
              formatter={(value: number | string) => {
                return typeof value === "number"
                  ? value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : value;
              }}
            />
            <Line
              type="monotone"
              dataKey="stochasticK"
              stroke="rgba(33, 150, 243, 1)"
              strokeWidth={1}
              dot={false}
              name="%K"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="stochasticD"
              stroke="rgba(255, 152, 0, 1)"
              strokeWidth={1}
              dot={false}
              name="%D"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { OHLCV } from "@/lib/indicators";
import {
  getBitcoinHalvingSignals,
  findNearestCandlestick,
} from "@/lib/halving-signals";
import { useMemo } from "react";
import { format } from "date-fns";
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

    // Prepare data points with all indicators
    return data.map((point, index) => ({
      date: new Date(point.date).toISOString(),
      dateLabel: format(new Date(point.date), "d MMM yyyy"),
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
    }));
  }, [data, indicators]);

  const referenceLines = useMemo(() => {
    if (!data.length || !chartData.length) return [];

    const signals = getBitcoinHalvingSignals();
    const dateRangeStart = new Date(data[0].date);
    const dateRangeEnd = new Date(data[data.length - 1].date);
    const lines: Array<{
      x: string;
      stroke: string;
      strokeDasharray?: string;
      label?: string;
    }> = [];

    // Helper function to find the exact matching dateLabel
    // This ensures the reference line aligns perfectly with the candlestick center
    const findNearestDateLabel = (targetDate: Date): string | null => {
      if (!chartData.length) return null;

      let nearestDataPoint = chartData[0];
      let minDiff = Math.abs(
        new Date(chartData[0].date).getTime() - targetDate.getTime()
      );

      for (const point of chartData) {
        const pointDate = new Date(point.date);
        const diff = Math.abs(pointDate.getTime() - targetDate.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          nearestDataPoint = point;
        }
      }

      // Return the exact dateLabel string from the chart data
      // This must match exactly for Recharts to center the line on the candlestick
      return nearestDataPoint.dateLabel;
    };

    // Halving dates
    signals.halvings.forEach((halvingDate, i) => {
      if (halvingDate >= dateRangeStart && halvingDate <= dateRangeEnd) {
        const dateLabel = findNearestDateLabel(halvingDate);
        if (dateLabel) {
          lines.push({
            x: dateLabel,
            stroke: "rgba(255, 255, 0, 0.8)",
            strokeDasharray: "5 5",
            label: `Halving ${i + 1}`,
          });
        }
      }
    });

    // Top signals (17 months / ~518 days after halving)
    signals.topSignals.forEach((topSignal, i) => {
      if (topSignal >= dateRangeStart && topSignal <= dateRangeEnd) {
        const dateLabel = findNearestDateLabel(topSignal);
        if (dateLabel) {
          lines.push({
            x: dateLabel,
            stroke: "rgba(0, 255, 0, 0.8)",
            strokeDasharray: "10 5",
            label: `Top ${i + 1}`,
          });
        }
      }
    });

    // Bottom signals (29 months / ~883 days after halving)
    signals.bottomSignals.forEach((bottomSignal, i) => {
      if (bottomSignal >= dateRangeStart && bottomSignal <= dateRangeEnd) {
        const dateLabel = findNearestDateLabel(bottomSignal);
        if (dateLabel) {
          lines.push({
            x: dateLabel,
            stroke: "rgba(255, 0, 0, 0.8)",
            strokeDasharray: "10 5",
            label: `Bottom ${i + 1}`,
          });
        }
      }
    });

    return lines;
  }, [data, chartData]);

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[800px] bg-background text-foreground">
        <div>Loading chart...</div>
      </div>
    );
  }

  const priceMin = Math.min(...data.map((d) => d.low));
  const priceMax = Math.max(...data.map((d) => d.high));

  return (
    <div className="space-y-4">
      {/* Main Price Chart */}
      <div className="bg-card rounded-lg p-4 border">
        <h2 className="text-xl font-bold text-card-foreground mb-4 text-center">
          Bitcoin (BTC-USD) - TradingView Style Chart
        </h2>
        <CandlestickChart
          data={chartData}
          referenceLines={referenceLines}
          priceMin={priceMin}
          priceMax={priceMax}
        />
      </div>

      {/* Stochastic Oscillator */}
      <div className="bg-card rounded-lg p-4 border">
        <h3 className="text-lg font-bold text-card-foreground mb-4 text-center">
          Stochastic Oscillator
        </h3>
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
              formatter={(value: any) => {
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
              strokeWidth={1.5}
              dot={false}
              name="%K"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="stochasticD"
              stroke="rgba(255, 152, 0, 1)"
              strokeWidth={1.5}
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

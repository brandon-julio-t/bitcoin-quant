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
  Cell,
} from "recharts";
import { OHLCV } from "@/lib/indicators";

interface CandlestickChartProps {
  data: Array<{
    date: string;
    dateLabel: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    ema13: number | null;
    ema21: number | null;
    ema50: number | null;
    ema100: number | null;
    bbUpper: number | null;
    bbMiddle: number | null;
    bbLower: number | null;
  }>;
  referenceLines: Array<{
    x: string;
    stroke: string;
    strokeDasharray?: string;
    label?: string;
  }>;
  priceMin: number;
  priceMax: number;
}

export default function CandlestickChart({
  data,
  referenceLines,
  priceMin,
  priceMax,
}: CandlestickChartProps) {
  // Transform data for candlestick rendering
  const candlestickData = data.map((d) => ({
    ...d,
    // For candlestick visualization, we'll use multiple data points
    candleHigh: d.high,
    candleLow: d.low,
    candleOpen: d.open,
    candleClose: d.close,
    isPositive: d.close >= d.open,
  }));

  return (
    <ResponsiveContainer width="100%" height={600}>
      <ComposedChart
        data={candlestickData}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <defs>
          <linearGradient id="bbFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="rgba(250, 250, 250, 0.1)" />
            <stop offset="95%" stopColor="rgba(250, 250, 250, 0.05)" />
          </linearGradient>
        </defs>
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
          domain={[priceMin * 0.95, priceMax * 1.05]}
          stroke="#ffffff"
          tick={{ fill: "#ffffff" }}
          label={{
            value: "Price (USD)",
            angle: -90,
            position: "insideLeft",
            style: { fill: "#ffffff" },
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            color: "#ffffff",
          }}
          labelStyle={{ color: "#9ca3af" }}
          formatter={(value: any, name: string) => {
            if (name === "candleHigh" || name === "candleLow") return null;
            return [value?.toFixed(2), name];
          }}
        />
        <Legend
          wrapperStyle={{ color: "#ffffff" }}
          iconType="line"
          formatter={(value) => (
            <span style={{ color: "#ffffff" }}>{value}</span>
          )}
        />

        {/* Bollinger Bands */}
        <Area
          type="monotone"
          dataKey="bbUpper"
          stroke="rgba(250, 250, 250, 0.3)"
          fill="url(#bbFill)"
          strokeWidth={1}
          name="BB Upper"
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="bbMiddle"
          stroke="rgba(250, 250, 250, 0.5)"
          strokeWidth={1}
          strokeDasharray="5 5"
          dot={false}
          name="BB Middle"
          connectNulls
        />
        <Area
          type="monotone"
          dataKey="bbLower"
          stroke="rgba(250, 250, 250, 0.3)"
          fill="url(#bbFill)"
          strokeWidth={1}
          name="BB Lower"
          connectNulls
        />

        {/* Price line (using close price) */}
        <Line
          type="monotone"
          dataKey="close"
          stroke="#26a69a"
          strokeWidth={2}
          dot={false}
          connectNulls
          name="BTC-USD"
        />

        {/* EMAs */}
        <Line
          type="monotone"
          dataKey="ema13"
          stroke="rgba(33, 150, 243, 1)"
          strokeWidth={1.5}
          dot={false}
          name="EMA 13"
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="ema21"
          stroke="rgba(255, 152, 0, 1)"
          strokeWidth={1.5}
          dot={false}
          name="EMA 21"
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="ema50"
          stroke="rgba(156, 39, 176, 1)"
          strokeWidth={1.5}
          dot={false}
          name="EMA 50"
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="ema100"
          stroke="rgba(255, 193, 7, 1)"
          strokeWidth={1.5}
          dot={false}
          name="EMA 100"
          connectNulls
        />

        {/* Reference Lines for Halving Signals */}
        {referenceLines.map((line, idx) => (
          <ReferenceLine
            key={`ref-${idx}`}
            x={line.x}
            stroke={line.stroke}
            strokeDasharray={line.strokeDasharray}
            label={{
              value: line.label,
              position: "top",
              fill: line.stroke,
              fontSize: 11,
            }}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

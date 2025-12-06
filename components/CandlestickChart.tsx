"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Bar,
} from "recharts";
import { OHLCV } from "@/lib/indicators";
import { useMemo } from "react";

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

// Custom candlestick shape for Bar component
const CandlestickShape = (props: any) => {
  const { x, y, width, payload } = props;
  const { open, high, low, close } = payload;
  const isPositive = close >= open;

  // Get the Y-axis scale and domain from props
  const yAxis = (props as any).yAxis;
  const yDomain = (props as any).yDomain || [0, 100];
  const chartHeight = (props as any).height || 600;
  const margin = (props as any).margin || { top: 20, bottom: 20 };

  // Calculate positions
  let highY: number, lowY: number, bodyTopY: number, bodyBottomY: number;

  if (yAxis && typeof yAxis.scale === "function") {
    // Use the scale if available (most accurate)
    const scale = yAxis.scale;
    highY = scale(high);
    lowY = scale(low);
    const bodyTop = Math.max(open, close);
    const bodyBottom = Math.min(open, close);
    bodyTopY = scale(bodyTop);
    bodyBottomY = scale(bodyBottom);
  } else {
    // Fallback: use the `y` prop as reference (it represents the Y position of `high`)
    // and calculate other positions relative to it
    const [minPrice, maxPrice] = yDomain;
    const priceRange = maxPrice - minPrice;
    const plotHeight = chartHeight - margin.top - margin.bottom;

    // The `y` prop from Bar component represents the Y position of the `high` value
    // Use it directly as our reference point
    highY = y;

    // Calculate price differences (in price units)
    const priceDiffHighLow = high - low;
    const bodyTop = Math.max(open, close);
    const bodyBottom = Math.min(open, close);
    const priceDiffHighBodyTop = high - bodyTop;
    const priceDiffHighBodyBottom = high - bodyBottom;

    // Convert price differences to pixel differences
    // In SVG, Y increases downward, so lower prices = higher Y values
    const pixelPerPrice = plotHeight / priceRange;

    lowY = highY + priceDiffHighLow * pixelPerPrice;
    bodyTopY = highY + priceDiffHighBodyTop * pixelPerPrice;
    bodyBottomY = highY + priceDiffHighBodyBottom * pixelPerPrice;
  }

  const wickColor = isPositive ? "#26a69a" : "#ef5350";
  const bodyColor = isPositive ? "#26a69a" : "#ef5350";

  const candleWidth = Math.max(width * 0.6, 4);
  const candleX = x - candleWidth / 2;
  const bodyHeight = Math.abs(bodyBottomY - bodyTopY);

  return (
    <g>
      {/* Wick (high-low line) */}
      <line
        x1={x}
        y1={highY}
        x2={x}
        y2={lowY}
        stroke={wickColor}
        strokeWidth={1.5}
      />
      {/* Body (open-close rectangle) */}
      <rect
        x={candleX}
        y={bodyTopY}
        width={candleWidth}
        height={Math.max(bodyHeight, 1)}
        fill={bodyColor}
        stroke={bodyColor}
        strokeWidth={1}
      />
    </g>
  );
};

export default function CandlestickChart({
  data,
  referenceLines,
  priceMin,
  priceMax,
}: CandlestickChartProps) {
  // Transform data for chart rendering
  const candlestickData = useMemo(() => {
    return data.map((d) => ({
      ...d,
    }));
  }, [data]);

  // Create a map of dateLabel to index for quick lookup
  const dateLabelToIndex = useMemo(() => {
    const map = new Map<string, number>();
    candlestickData.forEach((d, index) => {
      map.set(d.dateLabel, index);
    });
    return map;
  }, [candlestickData]);

  // Get reference line indices for custom rendering
  const referenceLineIndices = useMemo(() => {
    return referenceLines
      .map((line) => {
        const index = dateLabelToIndex.get(line.x);
        return index !== undefined ? { ...line, index } : null;
      })
      .filter((line): line is typeof line & { index: number } => line !== null);
  }, [referenceLines, dateLabelToIndex]);

  return (
    <ResponsiveContainer width="100%" height={600}>
      <ComposedChart
        data={candlestickData}
        margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
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
          type="category"
          allowDuplicatedCategory={false}
        />
        <YAxis
          domain={[priceMin * 0.95, priceMax * 1.05]}
          stroke="#ffffff"
          tick={{ fill: "#ffffff" }}
          tickFormatter={(value) => value.toLocaleString()}
          width={80}
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
            if (
              name === "candleHigh" ||
              name === "candleLow" ||
              name === "candleBody"
            )
              return null;
            return typeof value === "number"
              ? [
                  value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
                  name,
                ]
              : [value, name];
          }}
          content={(props: any) => {
            if (!props.active || !props.payload) return null;
            const data = props.payload[0]?.payload;
            if (!data) return null;
            return (
              <div
                style={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  padding: "8px",
                  borderRadius: "4px",
                }}
              >
                <p style={{ color: "#9ca3af", margin: 0, fontSize: "12px" }}>
                  {data.dateLabel}
                </p>
                <p style={{ color: "#ffffff", margin: "4px 0 0 0" }}>
                  O: $
                  {data.open.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p style={{ color: "#ffffff", margin: "2px 0" }}>
                  H: $
                  {data.high.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p style={{ color: "#ffffff", margin: "2px 0" }}>
                  L: $
                  {data.low.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p style={{ color: "#ffffff", margin: "2px 0 0 0" }}>
                  C: $
                  {data.close.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            );
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
        <Line
          type="monotone"
          dataKey="bbUpper"
          stroke="rgba(250, 250, 250, 0.3)"
          strokeWidth={1}
          dot={false}
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
        <Line
          type="monotone"
          dataKey="bbLower"
          stroke="rgba(250, 250, 250, 0.3)"
          strokeWidth={1}
          dot={false}
          name="BB Lower"
          connectNulls
        />

        {/* Candlesticks */}
        <Bar
          dataKey="high"
          shape={(props: any) => (
            <CandlestickShape
              {...props}
              yDomain={[priceMin * 0.95, priceMax * 1.05]}
              height={600}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            />
          )}
          name="BTC-USD"
          isAnimationActive={false}
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
        {/* Using ReferenceLine with exact dateLabel - Recharts should center it on the category */}
        {referenceLines.map((line, idx) => {
          const dataIndex = dateLabelToIndex.get(line.x);
          if (dataIndex === undefined || dataIndex < 0) return null;

          return (
            <ReferenceLine
              key={`ref-${idx}`}
              x={line.x}
              stroke={line.stroke}
              strokeDasharray={line.strokeDasharray}
              ifOverflow="visible"
              label={{
                value: line.label,
                position: "top",
                fill: line.stroke,
                fontSize: 11,
              }}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import {
  CandlestickData,
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  IChartApi,
  ISeriesApi,
  LineData,
  LineSeries,
  Time,
} from "lightweight-charts";
import { LogsIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
    // Signal flags
    isHalving?: boolean;
    isTopSignal?: boolean;
    isBottomSignal?: boolean;
    halvingLabel?: string;
    topSignalLabel?: string;
    bottomSignalLabel?: string;
  }>;
  onChartReady?: (chart: IChartApi) => void;
  onSeriesReady?: (series: ISeriesApi<"Candlestick">) => void;
}

/**
 * CandlestickChart component using TradingView Lightweight Charts
 * Displays candlestick data with EMAs, Bollinger Bands, and signal markers
 */
export default function CandlestickChart({
  data,
  onChartReady,
  onSeriesReady,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any>(null);
  const ema13SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema100SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMiddleSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [isLogarithmic, setIsLogarithmic] = useState(false);

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
      height: 600,
      rightPriceScale: {
        borderColor: "#ffffff",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        mode: 0, // Start with linear scale, will be updated by useEffect
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

    // Set initial scale mode
    chart.priceScale("right").applyOptions({
      mode: isLogarithmic ? 1 : 0, // 0 = Normal (linear), 1 = Logarithmic
    });

    // Notify parent component that chart is ready
    if (onChartReady) {
      onChartReady(chart);
    }

    // Create candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Create markers instance for the candlestick series
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    markersRef.current = createSeriesMarkers(candlestickSeries as any, []);

    // Notify parent component that series is ready
    if (onSeriesReady) {
      onSeriesReady(candlestickSeries);
    }

    // Create EMA series
    const ema13Series = chart.addSeries(LineSeries, {
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
    ema13SeriesRef.current = ema13Series;

    const ema21Series = chart.addSeries(LineSeries, {
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
    ema21SeriesRef.current = ema21Series;

    const ema50Series = chart.addSeries(LineSeries, {
      color: "rgba(156, 39, 176, 1)",
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
    ema50SeriesRef.current = ema50Series;

    const ema100Series = chart.addSeries(LineSeries, {
      color: "rgba(255, 193, 7, 1)",
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
    ema100SeriesRef.current = ema100Series;

    // Create Bollinger Bands series
    const bbUpperSeries = chart.addSeries(LineSeries, {
      color: "rgba(250, 250, 250, 0.3)",
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
    bbUpperSeriesRef.current = bbUpperSeries;

    const bbMiddleSeries = chart.addSeries(LineSeries, {
      color: "rgba(250, 250, 250, 0.5)",
      lineWidth: 1,
      lineStyle: 1, // Dashed line
      title: "",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    bbMiddleSeriesRef.current = bbMiddleSeries;

    const bbLowerSeries = chart.addSeries(LineSeries, {
      color: "rgba(250, 250, 250, 0.3)",
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
    bbLowerSeriesRef.current = bbLowerSeries;

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
  }, [onChartReady, onSeriesReady, isLogarithmic]);

  // Update chart data when data prop changes
  useEffect(() => {
    if (!data.length || !chartRef.current) return;

    // Convert data to TradingView format
    const candlestickData: CandlestickData<Time>[] = [];
    const ema13Data: LineData<Time>[] = [];
    const ema21Data: LineData<Time>[] = [];
    const ema50Data: LineData<Time>[] = [];
    const ema100Data: LineData<Time>[] = [];
    const bbUpperData: LineData<Time>[] = [];
    const bbMiddleData: LineData<Time>[] = [];
    const bbLowerData: LineData<Time>[] = [];

    // Minimum value for logarithmic scale to avoid log(0) or log(negative) issues
    const MIN_LOG_VALUE = 0.01;

    data.forEach((point) => {
      // Convert date string to timestamp (seconds)
      const timestamp = Math.floor(
        new Date(point.date).getTime() / 1000
      ) as Time;

      candlestickData.push({
        time: timestamp,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
      });

      if (point.ema13 !== null) {
        ema13Data.push({ time: timestamp, value: point.ema13 });
      }
      if (point.ema21 !== null) {
        ema21Data.push({ time: timestamp, value: point.ema21 });
      }
      if (point.ema50 !== null) {
        ema50Data.push({ time: timestamp, value: point.ema50 });
      }
      if (point.ema100 !== null) {
        ema100Data.push({ time: timestamp, value: point.ema100 });
      }

      // For Bollinger Bands: in logarithmic mode, filter out values <= 0
      // to prevent breaking the logarithmic scale rendering
      if (isLogarithmic) {
        if (point.bbUpper !== null && point.bbUpper > MIN_LOG_VALUE) {
          bbUpperData.push({ time: timestamp, value: point.bbUpper });
        }
        if (point.bbMiddle !== null && point.bbMiddle > MIN_LOG_VALUE) {
          bbMiddleData.push({ time: timestamp, value: point.bbMiddle });
        }
        if (point.bbLower !== null && point.bbLower > MIN_LOG_VALUE) {
          bbLowerData.push({ time: timestamp, value: point.bbLower });
        }
      } else {
        // In linear mode, include all valid Bollinger Band values
        if (point.bbUpper !== null) {
          bbUpperData.push({ time: timestamp, value: point.bbUpper });
        }
        if (point.bbMiddle !== null) {
          bbMiddleData.push({ time: timestamp, value: point.bbMiddle });
        }
        if (point.bbLower !== null) {
          bbLowerData.push({ time: timestamp, value: point.bbLower });
        }
      }
    });

    // Set data to series
    candlestickSeriesRef.current?.setData(candlestickData);
    ema13SeriesRef.current?.setData(ema13Data);
    ema21SeriesRef.current?.setData(ema21Data);
    ema50SeriesRef.current?.setData(ema50Data);
    ema100SeriesRef.current?.setData(ema100Data);
    bbUpperSeriesRef.current?.setData(bbUpperData);
    bbMiddleSeriesRef.current?.setData(bbMiddleData);
    bbLowerSeriesRef.current?.setData(bbLowerData);

    // Add markers for halving dates and signals
    type ChartMarker = {
      time: Time;
      position: "aboveBar" | "belowBar";
      color: string;
      shape: "arrowDown" | "arrowUp" | "circle";
      size: number;
      text: string;
    };
    const markers: ChartMarker[] = [];
    data.forEach((point) => {
      const timestamp = Math.floor(
        new Date(point.date).getTime() / 1000
      ) as Time;

      if (point.isHalving) {
        markers.push({
          time: timestamp,
          position: "belowBar",
          color: "#f59e0b",
          shape: "circle",
          size: 2,
          text: point.halvingLabel || "Halving",
        });
      }

      if (point.isTopSignal) {
        markers.push({
          time: timestamp,
          position: "aboveBar",
          color: "#ef4444",
          shape: "arrowDown",
          size: 2,
          text: point.topSignalLabel || "Top Signal",
        });
      }

      if (point.isBottomSignal) {
        markers.push({
          time: timestamp,
          position: "belowBar",
          color: "#10b981",
          shape: "arrowUp",
          size: 2,
          text: point.bottomSignalLabel || "Bottom Signal",
        });
      }
    });

    // Set markers on candlestick series using the markers instance
    // Markers must be sorted by time
    if (markersRef.current) {
      if (markers.length > 0) {
        // Sort markers by time to ensure proper rendering
        markers.sort((a, b) => {
          const timeA =
            typeof a.time === "number"
              ? a.time
              : new Date(a.time as string).getTime() / 1000;
          const timeB =
            typeof b.time === "number"
              ? b.time
              : new Date(b.time as string).getTime() / 1000;
          return timeA - timeB;
        });
        markersRef.current.setMarkers(markers);
      } else {
        // Clear markers if there are none
        markersRef.current.setMarkers([]);
      }
    }

    // Fit content
    chartRef.current.timeScale().fitContent();
  }, [data, isLogarithmic]);

  // Apply logarithmic scale mode when state changes
  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.priceScale("right").applyOptions({
      mode: isLogarithmic ? 1 : 0, // 0 = Normal (linear), 1 = Logarithmic
    });
  }, [isLogarithmic]);

  /**
   * Toggles between linear and logarithmic price scale modes
   */
  const toggleLogarithmicMode = () => {
    setIsLogarithmic((prev) => !prev);
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-end">
        <Button
          variant={isLogarithmic ? "default" : "outline"}
          size="sm"
          onClick={toggleLogarithmicMode}
          className="gap-2"
          aria-label={
            isLogarithmic
              ? "Switch to linear scale"
              : "Switch to logarithmic scale"
          }
        >
          <LogsIcon className="size-4" />
          <span>{isLogarithmic ? "Log" : "Linear"}</span>
        </Button>
      </div>
      <div
        ref={chartContainerRef}
        className="w-full"
        style={{ height: "600px" }}
      />
    </div>
  );
}

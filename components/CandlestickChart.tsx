"use client";

import { Button } from "@/components/ui/button";
import {
  CandlestickData,
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  HistogramData,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  ISeriesMarkersPluginApi,
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
    stochasticK?: number | null;
    stochasticD?: number | null;
    fearGreedValue?: number | null;
    fearGreedClassification?: string;
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

// Centralized pane height configuration
export const TOTAL_CHART_HEIGHT = 900;

export default function CandlestickChart({
  data,
  onChartReady,
  onSeriesReady,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const ema13SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema100SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMiddleSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const stochasticKSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const stochasticDSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const stochasticOverboughtLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const stochasticOversoldLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const fearGreedSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const fearGreedExtremeFearLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const fearGreedFearLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const fearGreedNeutralLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const fearGreedGreedLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const fearGreedExtremeGreedLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [isLogarithmic, setIsLogarithmic] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart instance with panes configuration
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#ffffff",
        panes: {
          separatorColor: "rgba(255, 255, 255, 0.2)",
          separatorHoverColor: "rgba(255, 255, 255, 0.4)",
          enableResize: true,
        },
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.1)" },
        horzLines: { color: "rgba(255, 255, 255, 0.1)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: TOTAL_CHART_HEIGHT,
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
    markersRef.current = createSeriesMarkers(candlestickSeries, []);

    // Volume histogram overlaid on price pane for immediate context
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "rgba(148, 163, 184, 0.6)",
      priceFormat: { type: "volume" },
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: "volume",
    });
    volumeSeriesRef.current = volumeSeries;

    // Keep price readable by squeezing volume to bottom of the main pane
    chart.priceScale("volume").applyOptions({
      scaleMargins: {
        top: 0.75,
        bottom: 0,
      },
      visible: false,
    });

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

    // Create Stochastic Oscillator series in pane 1
    // Overbought line (80)
    const stochasticOverboughtLine = chart.addSeries(
      LineSeries,
      {
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
      },
      1 // Pane index 1
    );
    stochasticOverboughtLineRef.current = stochasticOverboughtLine;

    // Oversold line (20)
    const stochasticOversoldLine = chart.addSeries(
      LineSeries,
      {
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
      },
      1 // Pane index 1
    );
    stochasticOversoldLineRef.current = stochasticOversoldLine;

    // Stochastic %K line
    const stochasticKSeries = chart.addSeries(
      LineSeries,
      {
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
      },
      1 // Pane index 1
    );
    stochasticKSeriesRef.current = stochasticKSeries;

    // Stochastic %D line
    const stochasticDSeries = chart.addSeries(
      LineSeries,
      {
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
      },
      1 // Pane index 1
    );
    stochasticDSeriesRef.current = stochasticDSeries;

    // Note: Price scale for pane 1 will be auto-configured based on the series data
    // The stochastic series will automatically use the right price scale of pane 1

    // Create Fear and Greed Index series in pane 2
    // Extreme Fear line (25)
    const fearGreedExtremeFearLine = chart.addSeries(
      LineSeries,
      {
        color: "#dc2626",
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
      },
      2 // Pane index 2
    );
    fearGreedExtremeFearLineRef.current = fearGreedExtremeFearLine;

    // Fear line (45)
    const fearGreedFearLine = chart.addSeries(
      LineSeries,
      {
        color: "#ea580c",
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
      },
      2 // Pane index 2
    );
    fearGreedFearLineRef.current = fearGreedFearLine;

    // Neutral line (55)
    const fearGreedNeutralLine = chart.addSeries(
      LineSeries,
      {
        color: "#f59e0b",
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
      },
      2 // Pane index 2
    );
    fearGreedNeutralLineRef.current = fearGreedNeutralLine;

    // Greed line (75)
    const fearGreedGreedLine = chart.addSeries(
      LineSeries,
      {
        color: "#16a34a",
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
      },
      2 // Pane index 2
    );
    fearGreedGreedLineRef.current = fearGreedGreedLine;

    // Fear and Greed Index line
    const fearGreedSeries = chart.addSeries(
      LineSeries,
      {
        color: "rgba(139, 92, 246, 1)",
        lineWidth: 2,
        title: "",
        priceFormat: {
          type: "price",
          precision: 0,
          minMove: 1,
        },
        priceLineVisible: false,
        lastValueVisible: false,
      },
      2 // Pane index 2
    );
    fearGreedSeriesRef.current = fearGreedSeries;

    // Configure all pane heights after series creation
    const panes = chart.panes();
    panes[0]?.setStretchFactor(3);
    panes[1]?.setStretchFactor(1.2);
    panes[2]?.setStretchFactor(1);

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
    const volumeData: HistogramData<Time>[] = [];
    const stochasticKData: LineData<Time>[] = [];
    const stochasticDData: LineData<Time>[] = [];
    const stochasticOverboughtData: LineData<Time>[] = [];
    const stochasticOversoldData: LineData<Time>[] = [];
    const fearGreedData: LineData<Time>[] = [];
    const fearGreedExtremeFearData: LineData<Time>[] = [];
    const fearGreedFearData: LineData<Time>[] = [];
    const fearGreedNeutralData: LineData<Time>[] = [];
    const fearGreedGreedData: LineData<Time>[] = [];
    const fearGreedExtremeGreedData: LineData<Time>[] = [];

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

      const volumeColor =
        point.close >= point.open
          ? "rgba(38, 166, 154, 0.2)"
          : "rgba(239, 83, 80, 0.2)";
      volumeData.push({
        time: timestamp,
        value: point.volume,
        color: volumeColor,
      });

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

      // Stochastic oscillator data
      if (point.stochasticK !== null && point.stochasticK !== undefined) {
        stochasticKData.push({ time: timestamp, value: point.stochasticK });
      }
      if (point.stochasticD !== null && point.stochasticD !== undefined) {
        stochasticDData.push({ time: timestamp, value: point.stochasticD });
      }

      // Stochastic reference lines (80 and 20)
      stochasticOverboughtData.push({ time: timestamp, value: 80 });
      stochasticOversoldData.push({ time: timestamp, value: 20 });

      // Fear and Greed Index data
      if (point.fearGreedValue !== null && point.fearGreedValue !== undefined) {
        fearGreedData.push({ time: timestamp, value: point.fearGreedValue });
      }

      // Fear and Greed reference lines
      fearGreedExtremeFearData.push({ time: timestamp, value: 25 });
      fearGreedFearData.push({ time: timestamp, value: 45 });
      fearGreedNeutralData.push({ time: timestamp, value: 55 });
      fearGreedGreedData.push({ time: timestamp, value: 75 });
      fearGreedExtremeGreedData.push({ time: timestamp, value: 100 });
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
    volumeSeriesRef.current?.setData(volumeData);
    stochasticKSeriesRef.current?.setData(stochasticKData);
    stochasticDSeriesRef.current?.setData(stochasticDData);
    stochasticOverboughtLineRef.current?.setData(stochasticOverboughtData);
    stochasticOversoldLineRef.current?.setData(stochasticOversoldData);
    fearGreedSeriesRef.current?.setData(fearGreedData);
    fearGreedExtremeFearLineRef.current?.setData(fearGreedExtremeFearData);
    fearGreedFearLineRef.current?.setData(fearGreedFearData);
    fearGreedNeutralLineRef.current?.setData(fearGreedNeutralData);
    fearGreedGreedLineRef.current?.setData(fearGreedGreedData);
    fearGreedExtremeGreedLineRef.current?.setData(fearGreedExtremeGreedData);

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
        style={{ height: `${TOTAL_CHART_HEIGHT}px` }}
      />
    </div>
  );
}

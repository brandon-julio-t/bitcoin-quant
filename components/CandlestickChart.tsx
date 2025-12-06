"use client";

import {
  CandlestickData,
  CandlestickSeries,
  ColorType,
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  LineSeries,
  Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

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
  priceMin: number;
  priceMax: number;
}

/**
 * CandlestickChart component using TradingView Lightweight Charts
 * Displays candlestick data with EMAs, Bollinger Bands, and signal markers
 */
export default function CandlestickChart({
  data,
  priceMin,
  priceMax,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ema13SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema100SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMiddleSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

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

    // Create EMA series
    const ema13Series = chart.addSeries(LineSeries, {
      color: "rgba(33, 150, 243, 1)",
      lineWidth: 2,
      title: "EMA 13",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });
    ema13SeriesRef.current = ema13Series;

    const ema21Series = chart.addSeries(LineSeries, {
      color: "rgba(255, 152, 0, 1)",
      lineWidth: 2,
      title: "EMA 21",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });
    ema21SeriesRef.current = ema21Series;

    const ema50Series = chart.addSeries(LineSeries, {
      color: "rgba(156, 39, 176, 1)",
      lineWidth: 2,
      title: "EMA 50",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });
    ema50SeriesRef.current = ema50Series;

    const ema100Series = chart.addSeries(LineSeries, {
      color: "rgba(255, 193, 7, 1)",
      lineWidth: 2,
      title: "EMA 100",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });
    ema100SeriesRef.current = ema100Series;

    // Create Bollinger Bands series
    const bbUpperSeries = chart.addSeries(LineSeries, {
      color: "rgba(250, 250, 250, 0.3)",
      lineWidth: 1,
      title: "BB Upper",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });
    bbUpperSeriesRef.current = bbUpperSeries;

    const bbMiddleSeries = chart.addSeries(LineSeries, {
      color: "rgba(250, 250, 250, 0.5)",
      lineWidth: 1,
      lineStyle: 1, // Dashed line
      title: "BB Middle",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });
    bbMiddleSeriesRef.current = bbMiddleSeries;

    const bbLowerSeries = chart.addSeries(LineSeries, {
      color: "rgba(250, 250, 250, 0.3)",
      lineWidth: 1,
      title: "BB Lower",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
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
  }, []);

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
      if (point.bbUpper !== null) {
        bbUpperData.push({ time: timestamp, value: point.bbUpper });
      }
      if (point.bbMiddle !== null) {
        bbMiddleData.push({ time: timestamp, value: point.bbMiddle });
      }
      if (point.bbLower !== null) {
        bbLowerData.push({ time: timestamp, value: point.bbLower });
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

    // Fit content
    chartRef.current.timeScale().fitContent();
  }, [data]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full"
      style={{ height: "600px" }}
    />
  );
}

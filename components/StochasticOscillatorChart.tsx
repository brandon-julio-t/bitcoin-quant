"use client";

import {
  ColorType,
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  LineSeries,
  Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

interface StochasticOscillatorChartProps {
  data: Array<{
    date: string;
    stochasticK?: number | null;
    stochasticD?: number | null;
  }>;
  onChartReady?: (chart: IChartApi) => void;
  onSeriesReady?: (series: ISeriesApi<"Line">) => void;
}

/**
 * StochasticOscillatorChart component using TradingView Lightweight Charts
 * Displays the Stochastic Oscillator (%K and %D lines) with overbought/oversold reference lines
 */
export default function StochasticOscillatorChart({
  data,
  onChartReady,
  onSeriesReady,
}: StochasticOscillatorChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const stochasticKSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const stochasticDSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const stochasticOverboughtLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const stochasticOversoldLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const onChartReadyRef = useRef(onChartReady);
  const onSeriesReadyRef = useRef(onSeriesReady);

  // Update refs when callbacks change
  useEffect(() => {
    onChartReadyRef.current = onChartReady;
    onSeriesReadyRef.current = onSeriesReady;
  }, [onChartReady, onSeriesReady]);

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
      height: 300,
      rightPriceScale: {
        borderColor: "#ffffff",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        visible: true,
        autoScale: true, // Enable auto-scaling for stochastic oscillator (0-100 range)
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

    // Configure right price scale for stochastic (0-100 range)
    chart.priceScale("right").applyOptions({
      autoScale: true, // Enable auto-scaling for stochastic oscillator
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    });

    // Notify parent component that chart is ready
    if (onChartReadyRef.current) {
      onChartReadyRef.current(chart);
    }

    // Create Stochastic Oscillator reference lines (overbought/oversold) attached to right price scale
    const stochasticOverboughtLine = chart.addSeries(LineSeries, {
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
      priceScaleId: "right", // Attach to right price scale
    });
    stochasticOverboughtLineRef.current = stochasticOverboughtLine;

    const stochasticOversoldLine = chart.addSeries(LineSeries, {
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
      priceScaleId: "right", // Attach to right price scale
    });
    stochasticOversoldLineRef.current = stochasticOversoldLine;

    // Create Stochastic %K and %D series attached to right price scale
    const stochasticKSeries = chart.addSeries(LineSeries, {
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
      priceScaleId: "right", // Attach to right price scale
    });
    stochasticKSeriesRef.current = stochasticKSeries;

    // Notify parent component that primary series is ready (use %K as primary)
    if (onSeriesReadyRef.current) {
      onSeriesReadyRef.current(stochasticKSeries);
    }

    const stochasticDSeries = chart.addSeries(LineSeries, {
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
      priceScaleId: "right", // Attach to right price scale
    });
    stochasticDSeriesRef.current = stochasticDSeries;

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
    const stochasticKData: LineData<Time>[] = [];
    const stochasticDData: LineData<Time>[] = [];
    const stochasticOverboughtData: LineData<Time>[] = [];
    const stochasticOversoldData: LineData<Time>[] = [];

    data.forEach((point) => {
      // Convert date string to timestamp (seconds)
      const timestamp = Math.floor(
        new Date(point.date).getTime() / 1000
      ) as Time;

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
    });

    // Set data to series
    stochasticKSeriesRef.current?.setData(stochasticKData);
    stochasticDSeriesRef.current?.setData(stochasticDData);
    stochasticOverboughtLineRef.current?.setData(stochasticOverboughtData);
    stochasticOversoldLineRef.current?.setData(stochasticOversoldData);

    // Fit content
    chartRef.current.timeScale().fitContent();
  }, [data]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full"
      style={{ height: "300px" }}
    />
  );
}

"use client";

import BitcoinChart from "@/components/BitcoinChart";
import ChartControls from "@/components/ChartControls";
import { calculateAllIndicators, OHLCV } from "@/lib/indicators";
import { format, subYears } from "date-fns";
import { useCallback, useEffect, useState } from "react";

export default function Home() {
  const [timeframe, setTimeframe] = useState("1m");
  const [startDate, setStartDate] = useState(
    format(subYears(new Date(), 10), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [activePreset, setActivePreset] = useState("10y");
  const [data, setData] = useState<OHLCV[]>([]);
  const [indicators, setIndicators] = useState<{
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
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        interval: timeframe,
        startDate,
        endDate,
      });

      const response = await fetch(`/api/bitcoin?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch Bitcoin data");
      }

      const bitcoinData: OHLCV[] = await response.json();
      if (bitcoinData.length === 0) {
        throw new Error("No data available for the selected date range");
      }

      setData(bitcoinData);
      const calculatedIndicators = calculateAllIndicators(bitcoinData);
      setIndicators(calculatedIndicators);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [timeframe, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdate = () => {
    fetchData();
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">
          Bitcoin Quant Indicators
        </h1>

        <ChartControls
          timeframe={timeframe}
          startDate={startDate}
          endDate={endDate}
          activePreset={activePreset}
          onTimeframeChange={setTimeframe}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onPresetClick={setActivePreset}
          onUpdate={handleUpdate}
        />

        {loading && (
          <div className="flex items-center justify-center h-[800px]">
            <div className="text-xl text-foreground">Loading chart data...</div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && data.length > 0 && indicators && (
          <BitcoinChart data={data} indicators={indicators} />
        )}
      </div>
    </main>
  );
}

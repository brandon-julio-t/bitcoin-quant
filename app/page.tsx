"use client";

import BitcoinChart from "@/components/BitcoinChart";
import ChartControls from "@/components/ChartControls";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { calculateAllIndicators, OHLCV } from "@/lib/indicators";
import { useQuery } from "@tanstack/react-query";
import { format, subYears } from "date-fns";
import { useMemo, useState } from "react";

async function fetchBitcoinData(
  timeframe: string,
  startDate: string,
  endDate: string
): Promise<OHLCV[]> {
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

  return bitcoinData;
}

export default function Home() {
  const [timeframe, setTimeframe] = useState("1m");
  const [startDate, setStartDate] = useState(
    format(subYears(new Date(), 10), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [activePreset, setActivePreset] = useState("10y");

  const {
    data: bitcoinData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["bitcoin", timeframe, startDate, endDate],
    queryFn: () => fetchBitcoinData(timeframe, startDate, endDate),
    staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh for 5 minutes
  });

  const indicators = useMemo(() => {
    if (!bitcoinData) return null;
    return calculateAllIndicators(bitcoinData);
  }, [bitcoinData]);

  const handleUpdate = () => {
    refetch();
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

        {isLoading && (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia>
                <Spinner />
              </EmptyMedia>
              <EmptyTitle>Loading chart data</EmptyTitle>
              <EmptyDescription>
                Please wait while we fetch the latest Bitcoin data...
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md mb-4">
            <strong>Error:</strong>{" "}
            {error instanceof Error ? error.message : "An error occurred"}
          </div>
        )}

        {!isLoading &&
          !error &&
          bitcoinData &&
          bitcoinData.length > 0 &&
          indicators && (
            <BitcoinChart data={bitcoinData} indicators={indicators} />
          )}
      </div>
    </main>
  );
}

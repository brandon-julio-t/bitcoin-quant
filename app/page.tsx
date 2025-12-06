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
import { useQueries, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo, useState } from "react";

/**
 * Bitcoin genesis block date: January 3, 2009
 * This is when Bitcoin was created
 */
const BITCOIN_BIRTH_DATE = "2009-01-03";

async function fetchBitcoinData(timeframe: string): Promise<OHLCV[]> {
  const now = format(new Date(), "yyyy-MM-dd");
  const params = new URLSearchParams({
    interval: timeframe,
    startDate: BITCOIN_BIRTH_DATE,
    endDate: now,
  });

  const response = await fetch(`/api/bitcoin?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch Bitcoin data");
  }

  const bitcoinData: OHLCV[] = await response.json();
  if (bitcoinData.length === 0) {
    throw new Error("No data available");
  }

  return bitcoinData;
}

const TIMEFRAMES = ["1d", "1w", "1m"] as const;

export default function Home() {
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("1m");

  // Load all timeframes in parallel for instant switching
  const timeframeQueries = useQueries({
    queries: TIMEFRAMES.map((tf) => ({
      queryKey: ["bitcoin", tf],
      queryFn: () => fetchBitcoinData(tf),
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh for 5 minutes
    })),
  });

  // Load halving dates in parallel with bitcoin data
  const {
    data: halvingDatesData,
    isLoading: isLoadingHalvingDates,
    error: halvingDatesError,
  } = useQuery<{ halvingDates: string[] }>({
    queryKey: ["halving-dates"],
    queryFn: async () => {
      const response = await fetch("/api/halving-dates");
      if (!response.ok) {
        throw new Error("Failed to fetch halving dates");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - halving dates don't change often
  });

  // Create a map of timeframe to query result for easy access
  const timeframeDataMap = useMemo(() => {
    const map = new Map<
      string,
      { data?: OHLCV[]; isLoading: boolean; error: Error | null }
    >();
    TIMEFRAMES.forEach((tf, index) => {
      const query = timeframeQueries[index];
      map.set(tf, {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error as Error | null,
      });
    });
    return map;
  }, [timeframeQueries]);

  // Get the current timeframe's data
  const currentTimeframeData = timeframeDataMap.get(timeframe);
  const bitcoinData = currentTimeframeData?.data;
  const isLoading = currentTimeframeData?.isLoading ?? false;
  const error = currentTimeframeData?.error ?? null;

  const indicators = useMemo(() => {
    if (!bitcoinData) return null;
    return calculateAllIndicators(bitcoinData);
  }, [bitcoinData]);

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">
          Bitcoin Quant Indicators
        </h1>

        <ChartControls
          timeframe={timeframe}
          onTimeframeChange={(tf) => {
            const validTimeframe = TIMEFRAMES.find((t) => t === tf);
            if (validTimeframe) {
              setTimeframe(validTimeframe);
            }
          }}
          loadingStates={Object.fromEntries(
            TIMEFRAMES.map((tf, index) => [
              tf,
              timeframeQueries[index].isLoading,
            ])
          )}
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
            <BitcoinChart
              data={bitcoinData}
              indicators={indicators}
              halvingDates={halvingDatesData?.halvingDates}
              isLoadingHalvingDates={isLoadingHalvingDates}
              halvingDatesError={halvingDatesError}
            />
          )}
      </div>
    </main>
  );
}

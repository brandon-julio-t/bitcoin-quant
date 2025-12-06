import { NextRequest, NextResponse } from "next/server";

interface BitcoinDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface YahooFinanceResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const interval = searchParams.get("interval") || "1d";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  try {
    // Map intervals to Yahoo Finance format
    const intervalMap: Record<string, string> = {
      "1d": "1d",
      "1w": "1wk",
      "1m": "1mo",
    };

    const yfInterval = intervalMap[interval] || interval;

    // Build Yahoo Finance API URL
    const now = Math.floor(Date.now() / 1000);
    const startTimestamp = startDate
      ? Math.floor(new Date(startDate).getTime() / 1000)
      : now - 10 * 365 * 24 * 60 * 60; // 10 years ago

    const endTimestamp = endDate
      ? Math.floor(new Date(endDate).getTime() / 1000)
      : now;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=${yfInterval}&period1=${startTimestamp}&period2=${endTimestamp}&includePrePost=false&events=div%7Csplit%7Cearn&lang=en-US&region=US`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.statusText}`);
    }

    const data: YahooFinanceResponse = await response.json();

    if (!data.chart?.result?.[0]) {
      throw new Error("No data returned from Yahoo Finance");
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    // Convert to our format
    const dataPoints: BitcoinDataPoint[] = timestamps
      .map((timestamp, index) => ({
        date: new Date(timestamp * 1000).toISOString(),
        open: quote.open[index] || 0,
        high: quote.high[index] || 0,
        low: quote.low[index] || 0,
        close: quote.close[index] || 0,
        volume: quote.volume[index] || 0,
      }))
      .filter((point) => point.open > 0 && point.close > 0);

    return NextResponse.json(dataPoints);
  } catch (error) {
    console.error("Error fetching Bitcoin data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Bitcoin data" },
      { status: 500 }
    );
  }
}

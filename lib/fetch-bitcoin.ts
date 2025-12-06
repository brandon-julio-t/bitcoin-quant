import { BITCOIN_BIRTH_DATE } from "@/lib/constants";
import { OHLCV } from "@/lib/indicators";

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

/**
 * Fetch Bitcoin data directly (bypassing HTTP layer)
 * Same logic as /api/bitcoin but called as a function
 */
export async function fetchBitcoinDataDirect(
  timeframe: string
): Promise<OHLCV[]> {
  const startTime = Date.now();
  console.log(
    `[${new Date().toISOString()}] 📈 Starting Bitcoin ${timeframe} fetch...`
  );

  // Map intervals to Yahoo Finance format
  const intervalMap: Record<string, string> = {
    "1d": "1d",
    "1w": "1wk",
    "1m": "1mo",
  };

  const yfInterval = intervalMap[timeframe] || timeframe;
  console.log(
    `[${new Date().toISOString()}] 🔄 Mapped ${timeframe} to Yahoo Finance interval: ${yfInterval}`
  );

  // Build Yahoo Finance API URL
  const now_timestamp = Math.floor(Date.now() / 1000);
  const startTimestamp = Math.floor(
    new Date(BITCOIN_BIRTH_DATE).getTime() / 1000
  );
  const endTimestamp = now_timestamp;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=${yfInterval}&period1=${startTimestamp}&period2=${endTimestamp}&includePrePost=false&events=div%7Csplit%7Cearn&lang=en-US&region=US`;

  console.log(
    `[${new Date().toISOString()}] 🌐 Fetching from Yahoo Finance: ${url}`
  );

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  console.log(
    `[${new Date().toISOString()}] 📡 Yahoo Finance response status: ${response.status}`
  );

  if (!response.ok) {
    console.error(
      `[${new Date().toISOString()}] ❌ Yahoo Finance API error: ${response.status} ${response.statusText}`
    );
    throw new Error(`Yahoo Finance API error: ${response.statusText}`);
  }

  const data: YahooFinanceResponse = await response.json();
  console.log(
    `[${new Date().toISOString()}] 📦 Received data from Yahoo Finance`
  );

  if (!data.chart?.result?.[0]) {
    console.error(
      `[${new Date().toISOString()}] ❌ No chart data in Yahoo Finance response`
    );
    throw new Error("No data returned from Yahoo Finance");
  }

  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];

  console.log(
    `[${new Date().toISOString()}] 📊 Processing ${timestamps.length} data points from Yahoo Finance`
  );

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

  const duration = Date.now() - startTime;
  console.log(
    `[${new Date().toISOString()}] ✅ Bitcoin ${timeframe} fetch completed in ${duration}ms with ${dataPoints.length} data points`
  );

  return dataPoints;
}

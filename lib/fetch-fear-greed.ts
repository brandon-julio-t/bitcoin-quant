interface FearGreedDataPoint {
  date: string;
  value: number;
  classification: string;
}

interface FearGreedAPIResponse {
  name: string;
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
  }>;
  metadata: {
    error: null | string;
  };
}

/**
 * Fetch Fear and Greed Index data directly (bypassing HTTP layer)
 */
export async function fetchFearGreedDataDirect(): Promise<
  Array<{ date: string; value: number; classification: string }>
> {
  const startTime = Date.now();
  console.log(
    `[${new Date().toISOString()}] 😱 Starting Fear & Greed Index fetch...`
  );

  const url = `https://api.alternative.me/fng/?limit=0`;
  console.log(
    `[${new Date().toISOString()}] 🌐 Fetching from Alternative.me: ${url}`
  );

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  console.log(
    `[${new Date().toISOString()}] 📡 Alternative.me response status: ${response.status}`
  );

  if (!response.ok) {
    console.error(
      `[${new Date().toISOString()}] ❌ Fear and Greed API error: ${response.status} ${response.statusText}`
    );
    throw new Error(`Fear and Greed API error: ${response.statusText}`);
  }

  const data: FearGreedAPIResponse = await response.json();
  console.log(
    `[${new Date().toISOString()}] 📦 Received ${JSON.stringify(data).length} bytes from Alternative.me`
  );

  if (data.metadata.error) {
    console.error(
      `[${new Date().toISOString()}] ❌ API Error from Alternative.me: ${data.metadata.error}`
    );
    throw new Error(`API Error: ${data.metadata.error}`);
  }

  console.log(
    `[${new Date().toISOString()}] 📊 Processing ${data.data.length} Fear & Greed data points`
  );

  // Convert to our format
  const dataPoints: FearGreedDataPoint[] = data.data
    .map((point) => ({
      date: new Date(parseInt(point.timestamp) * 1000).toISOString(),
      value: parseInt(point.value),
      classification: point.value_classification,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date ascending

  const duration = Date.now() - startTime;
  console.log(
    `[${new Date().toISOString()}] ✅ Fear & Greed fetch completed in ${duration}ms with ${dataPoints.length} data points`
  );

  return dataPoints;
}

import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get("limit") || "0"; // 0 means all historical data

  try {
    const url = `https://api.alternative.me/fng/?limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Fear and Greed API error: ${response.statusText}`);
    }

    const data: FearGreedAPIResponse = await response.json();

    if (data.metadata.error) {
      throw new Error(`API Error: ${data.metadata.error}`);
    }

    // Convert to our format
    const dataPoints: FearGreedDataPoint[] = data.data
      .map((point) => ({
        date: new Date(parseInt(point.timestamp) * 1000).toISOString(),
        value: parseInt(point.value),
        classification: point.value_classification,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date ascending

    return NextResponse.json(dataPoints);
  } catch (error) {
    console.error("Error fetching Fear and Greed data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Fear and Greed data" },
      { status: 500 }
    );
  }
}

import BitcoinChart from "@/components/BitcoinChart";
import { PageLayout } from "@/components/PageLayout";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TIMEFRAME_LABELS, TIMEFRAMES } from "@/lib/constants";
import { fetchBitcoinDataDirect } from "@/lib/fetch-bitcoin";
import { fetchFearGreedDataDirect } from "@/lib/fetch-fear-greed";
import { fetchHalvingDatesDirect } from "@/lib/fetch-halving-dates";
import { calculateAllIndicators } from "@/lib/indicators";

// Enable ISR with 1 hour revalidation in production, 1 second in development for fast updates
// Enable ISR: 1 second for development (fast updates), change to 3600 for production
export const revalidate = 3600;

export default async function Home() {
  console.log(
    `[${new Date().toISOString()}] 🚀 Starting page render on ${process.platform} with Node ${process.version}`
  );

  // Fetch all data on the server (direct function calls, no HTTP overhead)
  console.log(
    `[${new Date().toISOString()}] 📡 Starting parallel data fetches...`
  );

  const start = new Date();

  const [
    bitcoinData1d,
    bitcoinData1w,
    bitcoinData1m,
    halvingDatesData,
    fearGreedData,
  ] = await Promise.all([
    fetchBitcoinDataDirect("1d")
      .catch((error) => {
        console.error(
          `[${new Date().toISOString()}] ❌ Bitcoin 1d fetch failed:`,
          error
        );
        return [];
      })
      .finally(() => {
        console.log(
          `[${new Date().toISOString()}] ⏱️ Bitcoin 1d fetch completed in ${new Date().getTime() - start.getTime()}ms`
        );
      }),
    fetchBitcoinDataDirect("1w")
      .catch((error) => {
        console.error(
          `[${new Date().toISOString()}] ❌ Bitcoin 1w fetch failed:`,
          error
        );
        return [];
      })
      .finally(() => {
        console.log(
          `[${new Date().toISOString()}] ⏱️ Bitcoin 1w fetch completed in ${new Date().getTime() - start.getTime()}ms`
        );
      }),
    fetchBitcoinDataDirect("1m")
      .catch((error) => {
        console.error(
          `[${new Date().toISOString()}] ❌ Bitcoin 1m fetch failed:`,
          error
        );
        return [];
      })
      .finally(() => {
        console.log(
          `[${new Date().toISOString()}] ⏱️ Bitcoin 1m fetch completed in ${new Date().getTime() - start.getTime()}ms`
        );
      }),
    fetchHalvingDatesDirect()
      .catch((error) => {
        console.error(
          `[${new Date().toISOString()}] ❌ Halving dates fetch failed:`,
          error
        );
        return { halvingDates: [] };
      })
      .finally(() => {
        console.log(
          `[${new Date().toISOString()}] ⏱️ Halving dates fetch completed in ${new Date().getTime() - start.getTime()}ms`
        );
      }),
    fetchFearGreedDataDirect()
      .catch((error) => {
        console.error(
          `[${new Date().toISOString()}] ❌ Fear & Greed fetch failed:`,
          error
        );
        return [];
      })
      .finally(() => {
        console.log(
          `[${new Date().toISOString()}] ⏱️ Fear & Greed fetch completed in ${new Date().getTime() - start.getTime()}ms`
        );
      }),
  ]);

  console.log(`[${new Date().toISOString()}] ✅ All fetches completed`);
  console.log(`[${new Date().toISOString()}] 📊 Data received:`, {
    bitcoin1d: bitcoinData1d.length,
    bitcoin1w: bitcoinData1w.length,
    bitcoin1m: bitcoinData1m.length,
    halvingDates: halvingDatesData.halvingDates.length,
    fearGreed: fearGreedData.length,
  });

  // Calculate indicators for each timeframe
  const indicatorsMap = new Map<
    string,
    ReturnType<typeof calculateAllIndicators>
  >();
  if (bitcoinData1d.length > 0) {
    indicatorsMap.set("1d", calculateAllIndicators(bitcoinData1d));
  }
  if (bitcoinData1w.length > 0) {
    indicatorsMap.set("1w", calculateAllIndicators(bitcoinData1w));
  }
  if (bitcoinData1m.length > 0) {
    indicatorsMap.set("1m", calculateAllIndicators(bitcoinData1m));
  }

  // Create a map of Fear and Greed data by date for quick lookup
  const fearGreedMap = new Map<
    string,
    { value: number; classification: string }
  >();
  fearGreedData.forEach((point) => {
    // Normalize date to YYYY-MM-DD format for matching
    const dateKey = new Date(point.date).toISOString().split("T")[0];
    fearGreedMap.set(dateKey, {
      value: point.value,
      classification: point.classification,
    });
  });

  const timeframeData = {
    "1d": bitcoinData1d,
    "1w": bitcoinData1w,
    "1m": bitcoinData1m,
  };

  return (
    <PageLayout>
      <Tabs defaultValue="1m" className="w-full">
        <Field>
          <FieldLabel>Timeframe</FieldLabel>
          <TabsList>
            {TIMEFRAMES.map((tf) => (
              <TabsTrigger key={tf} value={tf}>
                {TIMEFRAME_LABELS[tf]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Field>

        {TIMEFRAMES.map((tf) => {
          const bitcoinData = timeframeData[tf];
          const indicators = indicatorsMap.get(tf);

          return (
            <TabsContent key={tf} value={tf}>
              {bitcoinData.length === 0 ? (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia>
                      <div className="text-muted-foreground">⚠️</div>
                    </EmptyMedia>
                    <EmptyTitle>Failed to load chart data</EmptyTitle>
                    <EmptyDescription>
                      Unable to fetch Bitcoin data for {TIMEFRAME_LABELS[tf]}.
                      Please try again later.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : indicators ? (
                <BitcoinChart
                  data={bitcoinData}
                  indicators={indicators}
                  halvingDates={halvingDatesData.halvingDates}
                  isLoadingHalvingDates={false}
                  halvingDatesError={null}
                  fearGreedData={fearGreedMap}
                />
              ) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia>
                      <div className="text-muted-foreground">📊</div>
                    </EmptyMedia>
                    <EmptyTitle>Processing data</EmptyTitle>
                    <EmptyDescription>
                      Calculating indicators for {TIMEFRAME_LABELS[tf]}...
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </PageLayout>
  );
}

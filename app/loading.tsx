import { PageLayout } from "@/components/PageLayout";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TIMEFRAMES, TIMEFRAME_LABELS } from "@/lib/constants";

export default function Loading() {
  return (
    <PageLayout>
      <Tabs defaultValue="1m" className="w-full">
        <Field>
          <FieldLabel>Timeframe</FieldLabel>
          <TabsList>
            {TIMEFRAMES.map((tf) => (
              <TabsTrigger key={tf} value={tf} disabled>
                {TIMEFRAME_LABELS[tf]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Field>

        {TIMEFRAMES.map((tf) => (
          <TabsContent key={tf} value={tf}>
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia>
                  <Spinner />
                </EmptyMedia>
                <EmptyTitle>Loading chart data</EmptyTitle>
                <EmptyDescription>
                  Fetching the latest Bitcoin data for {TIMEFRAME_LABELS[tf]}...
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </TabsContent>
        ))}
      </Tabs>
    </PageLayout>
  );
}

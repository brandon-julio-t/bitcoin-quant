"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface ChartControlsProps {
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  loadingStates?: Record<string, boolean>;
}

const TIMEFRAMES = [
  { value: "1d", label: "1 Day" },
  { value: "1w", label: "1 Week" },
  { value: "1m", label: "1 Month" },
] as const;

/**
 * ChartControls component for selecting chart timeframe
 * Date range is fixed from Bitcoin's birth (Jan 3, 2009) to now
 */
export default function ChartControls({
  timeframe,
  onTimeframeChange,
  loadingStates = {},
}: ChartControlsProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-foreground text-sm font-medium">Timeframe</label>
        <div className="flex gap-2">
          {TIMEFRAMES.map((tf) => {
            const isLoading = loadingStates[tf.value] ?? false;
            return (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? "default" : "outline"}
                onClick={() => onTimeframeChange(tf.value)}
                className="relative flex-1"
              >
                <span className="flex items-center justify-center gap-2">
                  {isLoading && (
                    <Spinner className="size-3" aria-label="Loading" />
                  )}
                  {tf.label}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

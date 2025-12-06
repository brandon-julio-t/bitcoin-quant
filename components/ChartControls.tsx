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
    <div className="space-y-4 mb-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground">Timeframe</label>
        <div className="flex gap-2">
          {TIMEFRAMES.map((tf) => {
            const isLoading = loadingStates[tf.value] ?? false;
            return (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? "default" : "outline"}
                onClick={() => onTimeframeChange(tf.value)}
                className="flex-1 relative"
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

"use client";

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChartControlsProps {
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
}

/**
 * ChartControls component for selecting chart timeframe
 * Date range is fixed from Bitcoin's birth (Jan 3, 2009) to now
 */
export default function ChartControls({
  timeframe,
  onTimeframeChange,
}: ChartControlsProps) {
  return (
    <div className="space-y-4 mb-6">
      <FieldGroup className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Field>
          <FieldLabel htmlFor="timeframe-select">Timeframe</FieldLabel>
          <Select value={timeframe} onValueChange={onTimeframeChange}>
            <SelectTrigger id="timeframe-select" className="w-full">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4h">4 Hours</SelectItem>
              <SelectItem value="1d">1 Day</SelectItem>
              <SelectItem value="1w">1 Week</SelectItem>
              <SelectItem value="1m">1 Month</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
    </div>
  );
}

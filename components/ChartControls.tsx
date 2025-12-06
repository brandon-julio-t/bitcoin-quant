"use client";

import { format, subDays, subMonths, subYears, startOfYear } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ChartControlsProps {
  timeframe: string;
  startDate: string;
  endDate: string;
  activePreset: string;
  onTimeframeChange: (timeframe: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onPresetClick: (preset: string) => void;
  onUpdate: () => void;
}

const presets = [
  { id: "1d", label: "1D" },
  { id: "1w", label: "1W" },
  { id: "1m", label: "1M" },
  { id: "3m", label: "3M" },
  { id: "6m", label: "6M" },
  { id: "ytd", label: "YTD" },
  { id: "1y", label: "1Y" },
  { id: "2y", label: "2Y" },
  { id: "5y", label: "5Y" },
  { id: "10y", label: "10Y" },
];

export default function ChartControls({
  timeframe,
  startDate,
  endDate,
  activePreset,
  onTimeframeChange,
  onStartDateChange,
  onEndDateChange,
  onPresetClick,
  onUpdate,
}: ChartControlsProps) {
  const handlePresetClick = (presetId: string) => {
    const today = new Date();
    let newStartDate = startDate;
    let newEndDate = format(today, "yyyy-MM-dd");

    switch (presetId) {
      case "1d":
        newStartDate = format(subDays(today, 1), "yyyy-MM-dd");
        break;
      case "1w":
        newStartDate = format(subDays(today, 7), "yyyy-MM-dd");
        break;
      case "1m":
        newStartDate = format(subMonths(today, 1), "yyyy-MM-dd");
        break;
      case "3m":
        newStartDate = format(subMonths(today, 3), "yyyy-MM-dd");
        break;
      case "6m":
        newStartDate = format(subMonths(today, 6), "yyyy-MM-dd");
        break;
      case "ytd":
        newStartDate = format(startOfYear(today), "yyyy-MM-dd");
        break;
      case "1y":
        newStartDate = format(subYears(today, 1), "yyyy-MM-dd");
        break;
      case "2y":
        newStartDate = format(subYears(today, 2), "yyyy-MM-dd");
        break;
      case "5y":
        newStartDate = format(subYears(today, 5), "yyyy-MM-dd");
        break;
      case "10y":
        newStartDate = format(subYears(today, 10), "yyyy-MM-dd");
        break;
    }

    onStartDateChange(newStartDate);
    onEndDateChange(newEndDate);
    onPresetClick(presetId);
  };

  const startDateObj = startDate ? new Date(startDate) : undefined;
  const endDateObj = endDate ? new Date(endDate) : undefined;

  return (
    <div className="space-y-4 mb-6">
      {/* Timeframe and Date Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Timeframe
          </label>
          <Select value={timeframe} onValueChange={onTimeframeChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4h">4 Hours</SelectItem>
              <SelectItem value="1d">1 Day</SelectItem>
              <SelectItem value="1w">1 Week</SelectItem>
              <SelectItem value="1m">1 Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Start Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDateObj && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDateObj ? (
                  format(startDateObj, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDateObj}
                onSelect={(date) => {
                  if (date) {
                    onStartDateChange(format(date, "yyyy-MM-dd"));
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            End Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDateObj && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDateObj ? (
                  format(endDateObj, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDateObj}
                onSelect={(date) => {
                  if (date) {
                    onEndDateChange(format(date, "yyyy-MM-dd"));
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-end">
          <Button onClick={onUpdate} className="w-full">
            Update Chart
          </Button>
        </div>
      </div>

      {/* Quick Date Range Presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Quick Date Range
        </label>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.id}
              variant={activePreset === preset.id ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(preset.id)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

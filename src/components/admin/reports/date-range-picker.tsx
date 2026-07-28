import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export type RangePreset = "today" | "7d" | "30d" | "month" | "lastMonth" | "quarter" | "year" | "custom";

export function computeRange(preset: RangePreset, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date();
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  switch (preset) {
    case "today":
      return { from: start.toISOString(), to: end.toISOString() };
    case "7d": {
      const s = new Date(start); s.setDate(s.getDate() - 6);
      return { from: s.toISOString(), to: end.toISOString() };
    }
    case "30d": {
      const s = new Date(start); s.setDate(s.getDate() - 29);
      return { from: s.toISOString(), to: end.toISOString() };
    }
    case "month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: s.toISOString(), to: end.toISOString() };
    }
    case "lastMonth": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from: s.toISOString(), to: e.toISOString() };
    }
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const s = new Date(now.getFullYear(), q * 3, 1);
      return { from: s.toISOString(), to: end.toISOString() };
    }
    case "year": {
      const s = new Date(now.getFullYear(), 0, 1);
      return { from: s.toISOString(), to: end.toISOString() };
    }
    case "custom":
      return {
        from: customFrom ? new Date(customFrom).toISOString() : start.toISOString(),
        to: customTo ? new Date(new Date(customTo).setHours(23, 59, 59, 999)).toISOString() : end.toISOString(),
      };
  }
}

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "month", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "year", label: "This Year" },
];

export function DateRangePicker(props: {
  preset: RangePreset;
  from: string;
  to: string;
  onChange: (preset: RangePreset, from: string, to: string) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [tmpFrom, setTmpFrom] = useState<Date | undefined>(new Date(props.from));
  const [tmpTo, setTmpTo] = useState<Date | undefined>(new Date(props.to));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <Button
          key={p.key}
          size="sm"
          variant={props.preset === p.key ? "default" : "outline"}
          onClick={() => {
            const r = computeRange(p.key);
            props.onChange(p.key, r.from, r.to);
          }}
        >
          {p.label}
        </Button>
      ))}
      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant={props.preset === "custom" ? "default" : "outline"}>
            <CalendarIcon className="mr-1 h-3.5 w-3.5" />
            {props.preset === "custom" ? `${format(new Date(props.from), "MMM d")} – ${format(new Date(props.to), "MMM d")}` : "Custom Range"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="end">
          <div className="flex gap-3">
            <div>
              <div className="mb-1 text-xs font-medium">From</div>
              <Calendar mode="single" selected={tmpFrom} onSelect={setTmpFrom} className={cn("rounded-md border pointer-events-auto")} />
            </div>
            <div>
              <div className="mb-1 text-xs font-medium">To</div>
              <Calendar mode="single" selected={tmpTo} onSelect={setTmpTo} className={cn("rounded-md border pointer-events-auto")} />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                if (tmpFrom && tmpTo) {
                  const r = computeRange("custom", tmpFrom.toISOString(), tmpTo.toISOString());
                  props.onChange("custom", r.from, r.to);
                  setCustomOpen(false);
                }
              }}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

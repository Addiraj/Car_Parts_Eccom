import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "amber" | "red" | "purple" | "gray";

const TONE_CLASS: Record<Tone, string> = {
  blue: "text-blue-600 dark:text-blue-400",
  green: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
  purple: "text-purple-600 dark:text-purple-400",
  gray: "text-muted-foreground",
};

export type Kpi = { label: string; value: string; tone?: Tone; pulse?: boolean };

export function KpiCards({ items }: { items: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
      {items.map((k) => (
        <div key={k.label} className={cn("rounded-lg border bg-surface p-4", k.pulse && "animate-pulse")}>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</div>
          <div className={cn("mt-1.5 text-2xl font-bold", TONE_CLASS[k.tone ?? "gray"])}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}

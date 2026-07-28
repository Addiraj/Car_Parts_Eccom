import { customerTypeLabel, type CustomerType } from "@/lib/pricing";

const STYLES: Record<CustomerType, string> = {
  IND: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  GAR: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  EXP: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};

export function CustomerTypeBadge({
  type,
  size = "sm",
  showLabel = true,
}: {
  type: CustomerType | null | undefined;
  size?: "xs" | "sm";
  showLabel?: boolean;
}) {
  if (!type) return null;
  const px = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wider ${px} ${STYLES[type]}`}>
      <span>{type}</span>
      {showLabel && <span className="normal-case tracking-normal opacity-80">· {customerTypeLabel(type)}</span>}
    </span>
  );
}

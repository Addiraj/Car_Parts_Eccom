import { Loader2, ShoppingCart, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type InventoryAddButtonProps = {
  existsInInventory: boolean;
  stock: number;
  isLoading?: boolean;
  adding?: boolean;
  onAdd?: () => void;
  size?: "sm" | "default";
  className?: string;
  compact?: boolean;
  isStaff?: boolean;
};

export function InventoryAddButton({
  existsInInventory,
  stock,
  isLoading,
  adding,
  onAdd,
  size = "sm",
  className,
  compact,
  isStaff,
}: InventoryAddButtonProps) {
  if (isLoading) {
    return (
      <Button size={size} variant="ghost" disabled className={cn("gap-1", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {!compact && <span>Checking…</span>}
      </Button>
    );
  }
  if (!existsInInventory) {
    return (
      <Button
        size={size}
        variant="outline"
        disabled
        title="Not carried in our inventory"
        className={cn("gap-1 cursor-not-allowed opacity-60", className)}
      >
        <Ban className="h-3.5 w-3.5" />
        <span>Not Available</span>
      </Button>
    );
  }
  if (stock <= 0) {
    const label = isStaff ? "Out of Stock" : "Unavailable";
    return (
      <Button
        size={size}
        variant="outline"
        disabled
        title={label}
        className={cn("gap-1 cursor-not-allowed opacity-60", className)}
      >
        <Ban className="h-3.5 w-3.5" />
        <span>{label}</span>
      </Button>
    );
  }
  return (
    <Button size={size} onClick={onAdd} disabled={adding} className={cn("gap-1", className)}>
      {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
      {!compact && <span>Add</span>}
    </Button>
  );
}

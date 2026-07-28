import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

export function ReportTable<T>(props: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  footer?: ReactNode;
  empty?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(props.total / props.pageSize));
  return (
    <div className="rounded-lg border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-surface-2">
            <tr>
              {props.columns.map((c) => (
                <th key={c.key} className={cn("px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {props.columns.map((c) => <td key={c.key} className="px-3 py-3"><div className="h-3 w-full animate-pulse rounded bg-muted" /></td>)}
                </tr>
              ))
            ) : props.rows.length === 0 ? (
              <tr><td colSpan={props.columns.length} className="px-3 py-10 text-center text-sm text-muted-foreground">{props.empty ?? "No records found"}</td></tr>
            ) : (
              props.rows.map((r, i) => (
                <tr key={i} className={cn("border-b hover:bg-surface-2/60", i % 2 === 1 && "bg-surface-2/30")}>
                  {props.columns.map((c) => <td key={c.key} className={cn("px-3 py-2 align-middle", c.className)}>{c.cell(r)}</td>)}
                </tr>
              ))
            )}
            {props.footer}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
        <div>
          {props.total === 0 ? "0 records" : `${(props.page - 1) * props.pageSize + 1}–${Math.min(props.total, props.page * props.pageSize)} of ${props.total}`}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={props.page <= 1} onClick={() => props.onPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={props.page <= 1} onClick={() => props.onPage(props.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="px-2">Page {props.page} of {totalPages}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={props.page >= totalPages} onClick={() => props.onPage(props.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={props.page >= totalPages} onClick={() => props.onPage(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { PartEditor } from "@/components/admin/part-editor";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/parts/new")({
  head: () => ({ meta: [{ title: "New part — Admin" }] }),
  component: NewPart,
});

function NewPart() {
  return (
    <div>
      <Link to="/admin/parts" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft size={12} /> Back to parts
      </Link>
      <h1 className="mt-2 text-2xl font-bold">New part</h1>
      <div className="mt-6"><PartEditor /></div>
    </div>
  );
}

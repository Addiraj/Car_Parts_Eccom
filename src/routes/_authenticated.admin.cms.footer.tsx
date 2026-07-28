import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { cmsGetFooter, cmsUpdateFooter } from "@/lib/admin.cms.functions";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/cms/footer")({
  head: () => ({ meta: [{ title: "Admin · Footer" }] }),
  component: FooterPage,
});

type Link = { label: string; url: string };
type Column = { title: string; links: Link[] };
type Footer = {
  about: string;
  phone: string;
  email: string;
  address: string;
  columns: Column[];
  social: { facebook?: string; instagram?: string; twitter?: string; linkedin?: string };
};

const blank: Footer = { about: "", phone: "", email: "", address: "", columns: [], social: {} };

function FooterPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["cms-footer"], queryFn: () => cmsGetFooter() });
  const [v, setV] = useState<Footer>(blank);
  useEffect(() => { if (data) setV({ ...blank, ...(data as any) }); }, [data]);

  const save = useMutation({
    mutationFn: () => cmsUpdateFooter({ data: { data: v } }),
    onSuccess: () => { toast.success("Footer saved"); qc.invalidateQueries({ queryKey: ["cms-footer"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const setCol = (i: number, col: Column) => setV((s) => ({ ...s, columns: s.columns.map((c, idx) => idx === i ? col : c) }));
  const addCol = () => setV((s) => ({ ...s, columns: [...s.columns, { title: "New", links: [] }] }));
  const delCol = (i: number) => setV((s) => ({ ...s, columns: s.columns.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Footer</h1>
          <p className="text-sm text-muted-foreground">Edit the site-wide footer.</p>
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {save.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>

      <section className="space-y-3 rounded-lg border bg-surface p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Company info</h2>
        <Field label="About / tagline"><textarea className="input input-textarea" value={v.about} onChange={(e) => setV({ ...v, about: e.target.value })} /></Field>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Phone"><input className="input" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>
          <Field label="Email"><input className="input" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
          <Field label="Address"><input className="input" value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></Field>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Link columns</h2>
          <button onClick={addCol} className="flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-surface-2"><Plus className="h-3 w-3" /> Add column</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {v.columns.map((col, i) => (
            <div key={i} className="rounded border bg-surface-2 p-3">
              <div className="mb-2 flex items-center gap-2">
                <input className="input flex-1" value={col.title} onChange={(e) => setCol(i, { ...col, title: e.target.value })} placeholder="Column title" />
                <button onClick={() => delCol(i)} className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="space-y-2">
                {col.links.map((l, j) => (
                  <div key={j} className="flex gap-2">
                    <input className="input flex-1" value={l.label} onChange={(e) => setCol(i, { ...col, links: col.links.map((x, k) => k === j ? { ...x, label: e.target.value } : x) })} placeholder="Label" />
                    <input className="input flex-1" value={l.url} onChange={(e) => setCol(i, { ...col, links: col.links.map((x, k) => k === j ? { ...x, url: e.target.value } : x) })} placeholder="URL" />
                    <button onClick={() => setCol(i, { ...col, links: col.links.filter((_, k) => k !== j) })} className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => setCol(i, { ...col, links: [...col.links, { label: "", url: "" }] })} className="flex w-full items-center justify-center gap-1 rounded border border-dashed py-1 text-xs text-muted-foreground hover:bg-surface">
                  <Plus className="h-3 w-3" /> Add link
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-surface p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Social links</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(["facebook", "instagram", "twitter", "linkedin"] as const).map((k) => (
            <Field key={k} label={k}><input className="input" value={v.social?.[k] ?? ""} onChange={(e) => setV({ ...v, social: { ...v.social, [k]: e.target.value } })} placeholder="https://…" /></Field>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}

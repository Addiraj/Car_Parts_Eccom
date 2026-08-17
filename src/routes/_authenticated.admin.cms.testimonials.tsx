import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { cmsListTestimonials, cmsUpsertTestimonial, cmsDeleteTestimonial } from "@/lib/admin.cms.functions";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/cms/testimonials")({
  head: () => ({ meta: [{ title: "Admin · Testimonials" }] }),
  component: TestimonialsPage,
});

type T = any;
const empty: T = { author_name: "", author_role: "", avatar_url: "", rating: 5, quote: "", display_order: 0, is_active: true };

function TestimonialsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(cmsListTestimonials);
  const upsertFn = useServerFn(cmsUpsertTestimonial);
  const deleteFn = useServerFn(cmsDeleteTestimonial);

  const { data = [] } = useQuery({ queryKey: ["cms-testimonials"], queryFn: () => listFn() });
  const [editing, setEditing] = useState<T | null>(null);
  const save = useMutation({
    mutationFn: (v: T) => upsertFn({ data: v }),
    onSuccess: () => { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["cms-testimonials"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-testimonials"] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Testimonials</h1>
          <p className="text-sm text-muted-foreground">Customer quotes shown on the storefront.</p>
        </div>
        <button onClick={() => setEditing({ ...empty })} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> New Testimonial
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(data as T[]).map((t) => (
          <div key={t.id} className="rounded-lg border bg-surface p-4">
            <div className="flex items-start gap-3">
              {t.avatar_url
                ? <img src={t.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold">{t.author_name[0]}</div>}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t.author_name}</span>
                  {!t.is_active && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Off</span>}
                </div>
                {t.author_role && <p className="text-xs text-muted-foreground">{t.author_role}</p>}
                <div className="mt-0.5 flex gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < t.rating ? "fill-current" : "opacity-30"}`} />)}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setEditing(t)} className="rounded p-1.5 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => confirm("Delete?") && del.mutate(t.id)} className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <blockquote className="mt-3 border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">"{t.quote}"</blockquote>
          </div>
        ))}
        {!data.length && <p className="rounded-lg border bg-surface p-6 text-center text-sm text-muted-foreground md:col-span-2">No testimonials yet.</p>}
      </div>

      {editing && <TestimonialForm value={editing} onCancel={() => setEditing(null)} onSave={(v) => save.mutate(v)} saving={save.isPending} />}
    </div>
  );
}

function TestimonialForm({ value, onCancel, onSave, saving }: { value: T; onCancel: () => void; onSave: (v: T) => void; saving: boolean }) {
  const [v, setV] = useState<T>(value);
  const upd = (k: string, val: any) => setV((s: T) => ({ ...s, [k]: val }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-xl rounded-lg border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">{v.id ? "Edit Testimonial" : "New Testimonial"}</h2>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Author name"><input className="input" value={v.author_name} onChange={(e) => upd("author_name", e.target.value)} /></Field>
            <Field label="Role / company"><input className="input" value={v.author_role ?? ""} onChange={(e) => upd("author_role", e.target.value)} /></Field>
          </div>
          <Field label="Avatar URL"><input className="input" value={v.avatar_url ?? ""} onChange={(e) => upd("avatar_url", e.target.value)} /></Field>
          <Field label="Quote"><textarea className="input input-textarea" value={v.quote} onChange={(e) => upd("quote", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rating (1-5)"><input type="number" min={1} max={5} className="input" value={v.rating} onChange={(e) => upd("rating", Number(e.target.value))} /></Field>
            <Field label="Display order"><input type="number" className="input" value={v.display_order} onChange={(e) => upd("display_order", Number(e.target.value))} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.is_active} onChange={(e) => upd("is_active", e.target.checked)} /> Active</label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md border px-3 py-1.5 text-sm">Cancel</button>
          <button disabled={saving} onClick={() => onSave(v)} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}

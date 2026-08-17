import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { cmsListBanners, cmsUpsertBanner, cmsDeleteBanner } from "@/lib/admin.cms.functions";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Image as ImageIcon, Calendar, Eye, EyeOff, Upload, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/cms/banners")({
  head: () => ({ meta: [{ title: "Admin · Hero Banners" }] }),
  component: HeroBannersPage,
});

type Banner = {
  id?: string;
  title: string;
  subtitle?: string | null;
  image_url: string;
  cta_label?: string | null;
  cta_url?: string | null;
  display_order: number;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

const emptyBanner: Banner = {
  title: "",
  subtitle: "",
  image_url: "",
  cta_label: "Explore Catalog",
  cta_url: "/catalog",
  display_order: 0,
  is_active: true,
  starts_at: null,
  ends_at: null,
};

function HeroBannersPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(cmsListBanners);
  const upsertFn = useServerFn(cmsUpsertBanner);
  const deleteFn = useServerFn(cmsDeleteBanner);

  const { data = [], isLoading } = useQuery({
    queryKey: ["cms-banners"],
    queryFn: () => listFn(),
  });

  const [editing, setEditing] = useState<Banner | null>(null);

  const save = useMutation({
    mutationFn: (v: Banner) => upsertFn({ data: v }),
    onSuccess: () => {
      toast.success("Hero Banner saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["cms-banners"] });
      qc.invalidateQueries({ queryKey: ["home-banners"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Banner deleted");
      qc.invalidateQueries({ queryKey: ["cms-banners"] });
      qc.invalidateQueries({ queryKey: ["home-banners"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = (banner: Banner) => {
    save.mutate({ ...banner, is_active: !banner.is_active });
  };

  const banners = data as Banner[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hero Banners CMS</h1>
          <p className="text-sm text-muted-foreground">Manage dynamic hero banners shown as background images at the top of the homepage.</p>
        </div>
        <button
          onClick={() => setEditing({ ...emptyBanner })}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Add Hero Banner
        </button>
      </div>

      {isLoading && (
        <div className="rounded-lg border bg-surface p-8 text-center text-sm text-muted-foreground">
          Loading Hero Banners…
        </div>
      )}

      {!isLoading && banners.length === 0 && (
        <div className="rounded-lg border bg-surface p-12 text-center">
          <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-3 text-base font-semibold">No custom Hero Banners</h3>
          <p className="mt-1 text-sm text-muted-foreground">The website is using the default hero backdrop. Upload a banner image to customize it.</p>
          <button
            onClick={() => setEditing({ ...emptyBanner })}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Create First Banner
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {banners.map((b) => (
          <div key={b.id} className="group relative overflow-hidden rounded-xl border bg-surface shadow-sm transition-all hover:shadow-md">
            <div className="relative h-44 w-full bg-muted">
              {b.image_url ? (
                <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 flex flex-col justify-end text-white">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg line-clamp-1">{b.title}</span>
                  {!b.is_active && (
                    <span className="rounded bg-destructive/80 px-2 py-0.5 text-[10px] font-bold uppercase">Disabled</span>
                  )}
                </div>
                {b.subtitle && <p className="text-xs text-white/80 line-clamp-1 mt-0.5">{b.subtitle}</p>}
              </div>

              <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/60 p-1 backdrop-blur">
                <button
                  onClick={() => toggleActive(b)}
                  className="rounded p-1 text-white hover:bg-white/20"
                  title={b.is_active ? "Disable Banner" : "Enable Banner"}
                >
                  {b.is_active ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4 text-rose-400" />}
                </button>
                <button
                  onClick={() => setEditing(b)}
                  className="rounded p-1 text-white hover:bg-white/20"
                  title="Edit Banner"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { if (confirm("Delete banner?")) del.mutate(b.id!); }}
                  className="rounded p-1 text-rose-300 hover:bg-rose-500/20"
                  title="Delete Banner"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>CTA Button: <strong className="text-foreground">{b.cta_label || "None"}</strong></span>
                <span>Order: <strong className="text-foreground">#{b.display_order}</strong></span>
              </div>
              {b.cta_url && <div>Link: <span className="font-mono text-foreground">{b.cta_url}</span></div>}
              {(b.starts_at || b.ends_at) && (
                <div className="flex items-center gap-1 text-[11px] text-amber-500">
                  <Calendar className="h-3 w-3" />
                  <span>Scheduled: {b.starts_at ? new Date(b.starts_at).toLocaleDateString() : "Now"} → {b.ends_at ? new Date(b.ends_at).toLocaleDateString() : "Always"}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <BannerFormModal
          value={editing}
          onCancel={() => setEditing(null)}
          onSave={(v) => save.mutate(v)}
          saving={save.isPending}
        />
      )}
    </div>
  );
}

function BannerFormModal({
  value,
  onCancel,
  onSave,
  saving,
}: {
  value: Banner;
  onCancel: () => void;
  onSave: (v: Banner) => void;
  saving: boolean;
}) {
  const [v, setV] = useState<Banner>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upd = (key: keyof Banner, val: any) => setV((prev) => ({ ...prev, [key]: val }));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      toast.error("Image file is too large (max 12MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        upd("image_url", evt.target.result as string);
        toast.success("Image file loaded successfully");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold tracking-tight mb-4">{v.id ? "Edit Hero Banner" : "New Hero Banner"}</h2>

        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Banner Title *</label>
            <input
              className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm"
              placeholder="e.g. Precision Parts. Delivered."
              value={v.title}
              onChange={(e) => upd("title", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Subtitle / Tagline</label>
            <input
              className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm"
              placeholder="e.g. Genuine & OEM components for luxury vehicles across UAE"
              value={v.subtitle ?? ""}
              onChange={(e) => upd("subtitle", e.target.value)}
            />
          </div>

          {/* Image Upload & Preview Section */}
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Hero Background Image *</label>
            
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {v.image_url ? (
              <div className="relative overflow-hidden rounded-lg border bg-surface-2 group mb-2">
                <img src={v.image_url} alt="Preview" className="h-36 w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md bg-white/90 px-3 py-1.5 text-xs font-semibold text-black hover:bg-white flex items-center gap-1"
                  >
                    <Upload className="h-3.5 w-3.5" /> Replace File
                  </button>
                  <button
                    type="button"
                    onClick={() => upd("image_url", "")}
                    className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 flex items-center gap-1"
                  >
                    <X className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface-2/50 p-6 text-center cursor-pointer hover:border-primary hover:bg-surface-2 transition-all mb-2"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm font-semibold text-foreground">Click to upload Hero Background Image</span>
                <span className="text-xs text-muted-foreground mt-0.5">Supports PNG, JPG, WEBP, SVG (max 12MB)</span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">or Image URL:</span>
              <input
                className="w-full rounded-md border bg-surface-2 px-3 py-1.5 text-xs font-mono"
                placeholder="https://images.unsplash.com/... or /assets/..."
                value={v.image_url}
                onChange={(e) => upd("image_url", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">CTA Button Label</label>
              <input
                className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm"
                placeholder="e.g. Explore Catalog"
                value={v.cta_label ?? ""}
                onChange={(e) => upd("cta_label", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">CTA Button Link</label>
              <input
                className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm font-mono text-xs"
                placeholder="e.g. /catalog or /vin"
                value={v.cta_url ?? ""}
                onChange={(e) => upd("cta_url", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Display Order</label>
              <input
                type="number"
                className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm"
                value={v.display_order}
                onChange={(e) => upd("display_order", Number(e.target.value))}
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium">
                <input
                  type="checkbox"
                  checked={v.is_active}
                  onChange={(e) => upd("is_active", e.target.checked)}
                  className="rounded border"
                />
                Active (Show on Homepage)
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Start Date (Optional)</label>
              <input
                type="datetime-local"
                className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm"
                value={v.starts_at ? new Date(v.starts_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => upd("starts_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">End Date (Optional)</label>
              <input
                type="datetime-local"
                className="w-full rounded-md border bg-surface-2 px-3 py-2 text-sm"
                value={v.ends_at ? new Date(v.ends_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => upd("ends_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !v.title.trim() || !v.image_url.trim()}
            onClick={() => onSave(v)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Banner"}
          </button>
        </div>
      </div>
    </div>
  );
}

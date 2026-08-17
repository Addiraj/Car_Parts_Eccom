import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAvatarProviders, setDefaultAvatarProvider, setProviderEnabled,
  updateSimliConfig, getSimliKeyStatus, uploadSimliFace, clearSimliFace,
} from "@/lib/avatar/avatar-providers.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as React from "react";
import { Upload, Trash2, ImageIcon, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/ai-assistant/avatar")({
  component: AvatarPage,
});

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function validateImage(file: File): Promise<{ ok: true } | { ok: false; error: string }> {
  if (file.size > MAX_BYTES) return { ok: false, error: "File too large (max 5MB)" };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { ok: false, error: "Only JPG, PNG, or WebP allowed" };
  }
  try {
    const url = URL.createObjectURL(file);
    const dim = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error("Cannot read image"));
      img.src = url;
    }).finally(() => URL.revokeObjectURL(url));
    if (dim.w < 512 || dim.h < 512) return { ok: false, error: `Image must be at least 512×512 (got ${dim.w}×${dim.h})` };
  } catch { /* ignore */ }
  return { ok: true };
}

function AvatarPage() {
  const listFn = useServerFn(listAvatarProviders);
  const setDefaultFn = useServerFn(setDefaultAvatarProvider);
  const setEnabledFn = useServerFn(setProviderEnabled);
  const qc = useQueryClient();

  const { data: providers } = useQuery({
    queryKey: ["avatar-providers"],
    queryFn: () => listFn(),
  });

  const simliRow = providers?.find((p: any) => p.provider === "simli");
  const isDefault = Boolean(simliRow?.is_default && simliRow?.is_enabled);
  const isEnabled = Boolean(simliRow?.is_enabled);

  const setDefault = useMutation({
    mutationFn: () => setDefaultFn({ data: { provider: "simli" } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["avatar-providers"] }); toast.success("Salone set as default"); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const setEnabled = useMutation({
    mutationFn: (enabled: boolean) => setEnabledFn({ data: { provider: "simli", enabled } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avatar-providers"] });
      qc.invalidateQueries({ queryKey: ["enabled-avatar-providers"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Avatar Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure the Salone real-time avatar for the storefront.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          Active: Salone
        </Badge>
      </div>

      <SimliPanel
        isDefault={isDefault}
        onSetDefault={() => setDefault.mutate()}
        isEnabled={isEnabled}
        onToggleEnabled={(v) => setEnabled.mutate(v)}
        row={simliRow}
      />
    </div>
  );
}

/* ============ Simli panel ============ */
function SimliPanel({ isDefault, onSetDefault, isEnabled, onToggleEnabled, row }: {
  isDefault: boolean; onSetDefault: () => void; isEnabled: boolean; onToggleEnabled: (v: boolean) => void; row: any;
}) {
  const qc = useQueryClient();
  const keyFn = useServerFn(getSimliKeyStatus);
  const uploadFn = useServerFn(uploadSimliFace);
  const clearFn = useServerFn(clearSimliFace);
  const updateCfgFn = useServerFn(updateSimliConfig);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const { data: keyStatus } = useQuery({ queryKey: ["simli-key-status"], queryFn: () => keyFn() });

  const [faceId, setFaceId] = React.useState<string>(row?.face_id ?? "");
  const [voiceId, setVoiceId] = React.useState<string>(row?.voice_id ?? "");
  const [model, setModel] = React.useState<"trinity" | "legacy">((row?.model ?? "trinity") as any);
  React.useEffect(() => {
    setFaceId(row?.face_id ?? "");
    setVoiceId(row?.voice_id ?? "");
    setModel((row?.model ?? "trinity") as any);
  }, [row?.face_id, row?.voice_id, row?.model]);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const v = await validateImage(file);
      if (!v.ok) throw new Error(v.error);
      const fileBase64 = await readAsBase64(file);
      return uploadFn({ data: { fileBase64, contentType: file.type as any, filename: file.name } });
    },
    onSuccess: () => {
      toast.success("Face uploaded — Salone face ID generated");
      qc.invalidateQueries({ queryKey: ["avatar-providers"] });
    },
    onError: (e: any) => toast.error(e?.message || "Upload failed"),
  });

  const clear = useMutation({
    mutationFn: () => clearFn(),
    onSuccess: () => { toast.success("Salone face cleared"); qc.invalidateQueries({ queryKey: ["avatar-providers"] }); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const saveCfg = useMutation({
    mutationFn: () => updateCfgFn({ data: { face_id: faceId || null, voice_id: voiceId || null, model } }),
    onSuccess: () => { toast.success("Salone settings saved"); qc.invalidateQueries({ queryKey: ["avatar-providers"] }); },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> Salone API key
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {keyStatus?.configured ? (
            <p className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> API key configured
            </p>
          ) : (
            <p className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" /> SIMLI_API_KEY not set — add it via project secrets to enable Salone.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Salone face</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="simli-enabled" className="text-xs text-muted-foreground">Enabled</Label>
            <Switch id="simli-enabled" checked={isEnabled} onCheckedChange={onToggleEnabled} />
            <Button size="sm" variant={isDefault ? "secondary" : "outline"} disabled={isDefault || !keyStatus?.configured} onClick={onSetDefault}>
              {isDefault ? "Default" : "Set as default"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex h-64 w-64 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {row?.avatar_image_url ? (
                <img src={row.avatar_image_url} alt="Salone face" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 p-6 text-center text-xs text-muted-foreground">
                  <ImageIcon className="h-8 w-8 opacity-50" /> No face uploaded
                </div>
              )}
            </div>
            <div className="flex flex-1 min-w-[240px] flex-col gap-3">
              <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = "";
              }} />
              <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending || !keyStatus?.configured}>
                <Upload className="mr-2 h-4 w-4" />
                {upload.isPending ? "Uploading…" : row?.face_id ? "Replace face image" : "Upload face image"}
              </Button>
              {row?.face_id && (
                <Button variant="outline" onClick={() => clear.mutate()} disabled={clear.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" /> Remove face
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>API Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Face ID (Required)</Label>
              <Input placeholder="Simli Face ID" value={faceId} onChange={(e) => setFaceId(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">Auto-generated when you upload an image, or paste manually if it fails.</p>
            </div>
            <div className="space-y-2">
              <Label>Voice ID (Optional)</Label>
              <Input placeholder="e.g. simli voice id" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={model} onValueChange={(v) => setModel(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trinity">Trinity (latest)</SelectItem>
                  <SelectItem value="legacy">Legacy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => saveCfg.mutate()} disabled={saveCfg.isPending}>
            {saveCfg.isPending ? "Saving…" : "Save settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4" /> Image requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>Front-facing, face clearly visible</li>
            <li>JPG or PNG, minimum 512×512</li>
            <li>Good even lighting</li>
            <li>Single person only — multiple faces will be rejected</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

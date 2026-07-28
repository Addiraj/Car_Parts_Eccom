import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPrompts, savePrompt, listRevisions, uploadPromptReference, removePromptReference } from "@/lib/ai-prompts.functions";
import { listVipNumbers, addVipNumber, deleteVipNumber } from "@/lib/ai-vip-numbers.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import * as React from "react";
import { History, Save, RotateCcw, Crown, Upload, X, FileText, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/ai-assistant/prompts")({
  component: PromptsPage,
});

type PromptRow = {
  id: string; key: string; name: string; description: string | null;
  content: string; model: string; temperature: number; version: number;
  is_active: boolean; updated_at: string;
  aliases_text: string | null;
  clarification_rules_text: string | null;
  reference_file_path: string | null;
  reference_file_name: string | null;
};

const MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
];

function PromptsPage() {
  const listFn = useServerFn(listPrompts);
  const saveFn = useServerFn(savePrompt);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ai-prompts"], queryFn: () => listFn() });
  const prompts = (q.data ?? []) as PromptRow[];
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  const [vipOpen, setVipOpen] = React.useState(false);

  React.useEffect(() => {
    if (!activeKey && prompts.length) setActiveKey(prompts[0].key);
  }, [prompts, activeKey]);

  const active = prompts.find((p) => p.key === activeKey) ?? null;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">AI Prompt Management</h1>
        <p className="text-sm text-muted-foreground">
          Edit the assistant's behavior live. Changes are picked up by the chatbot within ~60 seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Prompts</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {q.isLoading ? <div className="text-xs text-muted-foreground">Loading…</div> : null}
            {prompts.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveKey(p.key)}
                className={`w-full text-left px-2 py-2 rounded text-sm transition ${activeKey === p.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <div className="font-medium">{p.name}</div>
                <div className={`text-[10px] ${activeKey === p.key ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  v{p.version} · {new Date(p.updated_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {active ? (
          <PromptEditor
            key={`${active.id}-${active.version}-${active.updated_at}`}
            prompt={active}
            onOpenVip={() => setVipOpen(true)}
            onSave={async (patch) => {
              try {
                const res = await saveFn({ data: { key: active.key, ...patch } });
                toast.success(`Saved v${res?.version ?? active.version + 1}`);
                await qc.invalidateQueries({ queryKey: ["ai-prompts"] });
                await qc.invalidateQueries({ queryKey: ["ai-prompt-revisions", active.id] });
              } catch (e: any) {
                console.error("[savePrompt] failed", e);
                toast.error(e?.message ?? "Save failed");
                throw e;
              }
            }}
          />
        ) : null}
      </div>

      <VipDialog open={vipOpen} onOpenChange={setVipOpen} />
    </div>
  );
}

function PromptEditor({
  prompt,
  onSave,
  onOpenVip,
}: {
  prompt: PromptRow;
  onSave: (patch: {
    content: string; model: string; temperature: number;
    aliasesText: string | null; clarificationRulesText: string | null;
    referenceFilePath: string | null; referenceFileName: string | null;
  }) => Promise<void>;
  onOpenVip: () => void;
}) {
  const [content, setContent] = React.useState(prompt.content);
  const [aliases, setAliases] = React.useState(prompt.aliases_text ?? "");
  const [rules, setRules] = React.useState(prompt.clarification_rules_text ?? "");
  const [refPath, setRefPath] = React.useState<string | null>(prompt.reference_file_path);
  const [refName, setRefName] = React.useState<string | null>(prompt.reference_file_name);
  const [model, setModel] = React.useState(prompt.model);
  const [temp, setTemp] = React.useState(Number(prompt.temperature));
  const [showHistory, setShowHistory] = React.useState(false);

  const save = useMutation({
    mutationFn: () => onSave({
      content, model, temperature: temp,
      aliasesText: aliases || null,
      clarificationRulesText: rules || null,
      referenceFilePath: refPath,
      referenceFileName: refName,
    }),
  });

  const revFn = useServerFn(listRevisions);
  const rev = useQuery({
    queryKey: ["ai-prompt-revisions", prompt.id],
    queryFn: () => revFn({ data: { promptId: prompt.id } }),
    enabled: showHistory,
  });

  const uploadFn = useServerFn(uploadPromptReference);
  const removeFn = useServerFn(removePromptReference);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);

  const handleFile = async (file: File) => {
    if (!/\.(pdf|txt)$/i.test(file.name)) {
      toast.error("Only PDF or TXT files");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large — max 10 MB");
      return;
    }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // Chunked base64 encoding — spreading large Uint8Arrays into
      // String.fromCharCode blows the call stack on multi-MB files.
      const CHUNK = 0x8000;
      let binary = "";
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
      }
      const base64 = btoa(binary);
      const res = await uploadFn({ data: { key: prompt.key, filename: file.name, base64, contentType: file.type } });
      setRefPath(res.path);
      setRefName(res.name);
      toast.success("File uploaded — remember to Save");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeRef = async () => {
    try {
      await removeFn({ data: { key: prompt.key } });
      setRefPath(null);
      setRefName(null);
      toast.success("Reference removed");
    } catch (e: any) {
      toast.error(e.message ?? "Remove failed");
    }
  };

  const insertToken = (token: string) => setContent((c) => c + (c.endsWith("\n") ? "" : "\n") + token);

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
          <div className="flex flex-col">
            <span>{prompt.name} <span className="text-xs text-muted-foreground">v{prompt.version}</span></span>
            {prompt.description ? <span className="text-xs font-normal text-muted-foreground mt-1">{prompt.description}</span> : null}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onOpenVip}
              className="bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white shadow-md"
            >
              <Crown className="h-4 w-4 mr-1" /> VIP Access
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowHistory((s) => !s)}>
              <History className="h-4 w-4 mr-1" /> History
            </Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="h-4 w-4 mr-1" /> {save.isPending ? "Saving…" : "Save & activate"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Temperature ({temp.toFixed(2)})</Label>
            <Input type="range" min={0} max={2} step={0.05} value={temp} onChange={(e) => setTemp(Number(e.target.value))} />
          </div>
        </div>

        {prompt.key === "system" ? (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="ghost" type="button" onClick={() => insertToken("{{vehicle}}")}>
              Insert {"{{vehicle}}"} token
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => { setContent(prompt.content); setAliases(prompt.aliases_text ?? ""); setRules(prompt.clarification_rules_text ?? ""); }}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset edits
            </Button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">System Prompt</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={18}
              className="font-mono text-sm resize-y"
              placeholder="Salutations & Greetings, behavior rules…"
            />
            <div className="text-[10px] text-muted-foreground">{content.length} chars</div>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Parts Aliases (Normalization)</Label>
            <Textarea
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              rows={18}
              className="font-mono text-sm resize-y"
              placeholder="-> A C Filter / Cabin Filter / Pollen Filter / Interior Air Filter"
            />
            <div className="text-[10px] text-muted-foreground">{aliases.length} chars</div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Clarification Rules</Label>
          <Textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            rows={10}
            className="font-mono text-sm resize-y"
            placeholder="Control Arm  -  front upper left or front upper right or rear upper left or rear upper right…"
          />
          <div className="text-[10px] text-muted-foreground">{rules.length} chars</div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Reference File (PDF / TXT) — Optional</Label>
          {refName ? (
            <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1 truncate">{refName}</span>
              <button
                type="button"
                onClick={removeRef}
                className="text-xs font-medium text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void handleFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center cursor-pointer transition ${dragOver ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/50 hover:bg-muted/30"}`}
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div className="text-sm">{uploading ? "Uploading…" : "Drop a PDF / TXT here, or click to browse"}</div>
              <div className="text-[11px] text-muted-foreground">The chatbot will follow instructions/rules from this file.</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.currentTarget.value = ""; }}
              />
            </div>
          )}
        </div>

        {showHistory ? (
          <div className="border-t pt-3 space-y-2">
            <div className="text-sm font-medium">Revisions</div>
            {rev.isLoading ? <div className="text-xs text-muted-foreground">Loading…</div> : null}
            <div className="space-y-1 max-h-72 overflow-auto">
              {(rev.data ?? []).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-2 border rounded p-2 text-xs">
                  <div>
                    <div className="font-medium">v{r.version}</div>
                    <div className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    setContent(r.content);
                    setModel(r.model);
                    setTemp(Number(r.temperature));
                    setAliases(r.aliases_text ?? "");
                    setRules(r.clarification_rules_text ?? "");
                    setRefPath(r.reference_file_path ?? null);
                    setRefName(r.reference_file_name ?? null);
                    toast.message(`Loaded v${r.version} — click Save to activate`);
                  }}>
                    Load
                  </Button>
                </div>
              ))}
              {!rev.isLoading && !(rev.data ?? []).length ? (
                <div className="text-xs text-muted-foreground">No revisions yet.</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function VipDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const listFn = useServerFn(listVipNumbers);
  const addFn = useServerFn(addVipNumber);
  const delFn = useServerFn(deleteVipNumber);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ai-vip-numbers"], queryFn: () => listFn(), enabled: open });
  const [phone, setPhone] = React.useState("");
  const [label, setLabel] = React.useState("");

  const onAdd = async () => {
    if (!phone.trim()) return;
    try {
      await addFn({ data: { phone: phone.trim(), label: label.trim() || undefined } });
      setPhone(""); setLabel("");
      qc.invalidateQueries({ queryKey: ["ai-vip-numbers"] });
      toast.success("Added");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add");
    }
  };

  const onDel = async (id: string) => {
    try {
      await delFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["ai-vip-numbers"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  const rows = (q.data ?? []) as Array<{ id: string; phone: string; label: string | null; created_at: string }>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Crown className="h-4 w-4 text-fuchsia-500" /> VIP Access</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr,1fr,auto] gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Phone number</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+9715XXXXXXXX" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label (optional)</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Owner / Showroom" />
            </div>
            <Button onClick={onAdd}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>
          <div className="border rounded-md max-h-72 overflow-auto divide-y">
            {q.isLoading ? <div className="p-3 text-xs text-muted-foreground">Loading…</div> : null}
            {!q.isLoading && !rows.length ? <div className="p-3 text-xs text-muted-foreground">No VIP numbers yet.</div> : null}
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2 text-sm">
                <div className="flex-1">
                  <div className="font-mono">{r.phone}</div>
                  {r.label ? <div className="text-[11px] text-muted-foreground">{r.label}</div> : null}
                </div>
                <Button size="icon" variant="ghost" onClick={() => onDel(r.id)} aria-label="Delete">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}><X className="h-4 w-4 mr-1" /> Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

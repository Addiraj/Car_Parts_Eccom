import * as React from "react";
import { createParser } from "eventsource-parser";
import { toast } from "sonner";

/**
 * Voice hook for the AI Avatar:
 *  - record(): start mic recording; stop() returns transcript string
 *  - speak(text): stream TTS PCM and play via Web Audio; exposes live `amplitude` (0..1)
 *  - cancel(): stop any current playback
 */
export function useVoice() {
  const [isRecording, setIsRecording] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [amplitude, setAmplitude] = React.useState(0);

  const recRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const ctxRef = React.useRef<AudioContext | null>(null);
  const playheadRef = React.useRef(0);
  const pendingRef = React.useRef<Uint8Array>(new Uint8Array(0));
  const sourcesRef = React.useRef<AudioBufferSourceNode[]>([]);
  const ampTimerRef = React.useRef<number | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const getToken = React.useCallback(() => {
    return localStorage.getItem("jwt_token") ?? null;
  }, []);

  const startRecording = React.useCallback(async () => {
    if (recRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
      if (!mime) {
        stream.getTracks().forEach((t) => t.stop());
        toast.error("Browser can't record supported audio");
        return;
      }
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.start();
      recRef.current = rec;
      streamRef.current = stream;
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }, []);

  const stopRecording = React.useCallback(async (): Promise<string> => {
    const rec = recRef.current;
    const stream = streamRef.current;
    if (!rec) return "";
    return await new Promise((resolve) => {
      rec.onstop = async () => {
        stream?.getTracks().forEach((t) => t.stop());
        recRef.current = null;
        streamRef.current = null;
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        if (blob.size < 1024) { resolve(""); return; }
        try {
          const token = getToken();
          const fd = new FormData();
          fd.append("file", blob);
          const res = await fetch("/api/ai/transcribe", {
            method: "POST",
            body: fd,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (!res.ok) { resolve(""); return; }
          const reader = res.body!.getReader();
          const dec = new TextDecoder();
          let full = "";
          let buffer = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += dec.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              try {
                const ev = JSON.parse(line.slice(5).trim());
                if (ev.type === "transcript.text.delta") full += ev.delta ?? "";
                if (ev.type === "transcript.text.done" && ev.text) full = ev.text;
              } catch {/* ignore */}
            }
          }
          resolve(full);
        } catch {
          resolve("");
        }
      };
      try { rec.stop(); } catch { resolve(""); }
    });
  }, [getToken]);

  const cancel = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch {/* */} });
    sourcesRef.current = [];
    playheadRef.current = 0;
    pendingRef.current = new Uint8Array(0);
    if (ampTimerRef.current) { window.clearInterval(ampTimerRef.current); ampTimerRef.current = null; }
    setAmplitude(0);
    setIsSpeaking(false);
  }, []);

  const speak = React.useCallback(async (text: string) => {
    if (!text?.trim()) return;
    cancel();
    const token = getToken();

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctxRef.current) ctxRef.current = new Ctx({ sampleRate: 24000 });
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") { try { await ctx.resume(); } catch {/* */} }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.connect(ctx.destination);
    const ampBuf = new Uint8Array(analyser.frequencyBinCount);

    if (ampTimerRef.current) window.clearInterval(ampTimerRef.current);
    ampTimerRef.current = window.setInterval(() => {
      analyser.getByteTimeDomainData(ampBuf);
      let sum = 0;
      for (let i = 0; i < ampBuf.length; i++) { const v = (ampBuf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / ampBuf.length);
      setAmplitude(Math.min(1, rms * 3));
    }, 60);

    setIsSpeaking(true);
    const playChunk = (incoming: Uint8Array) => {
      const merged = new Uint8Array(pendingRef.current.length + incoming.length);
      merged.set(pendingRef.current);
      merged.set(incoming, pendingRef.current.length);
      const usable = merged.length - (merged.length % 2);
      pendingRef.current = merged.slice(usable);
      if (usable === 0) return;
      const samples = new Int16Array(merged.buffer, 0, usable / 2);
      const floats = Float32Array.from(samples, (s) => s / 32768);
      const buffer = ctx.createBuffer(1, floats.length, 24000);
      buffer.copyToChannel(floats, 0);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(analyser);
      const startAt = playheadRef.current === 0
        ? ctx.currentTime + 0.05
        : Math.max(playheadRef.current, ctx.currentTime);
      src.start(startAt);
      playheadRef.current = startAt + buffer.duration;
      sourcesRef.current.push(src);
      src.onended = () => {
        sourcesRef.current = sourcesRef.current.filter((s) => s !== src);
      };
    };

    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/ai/speak", {
        method: "POST",
        signal: ac.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      if (!res.ok || !res.body) { cancel(); return; }
      const parser = createParser({
        onEvent(ev) {
          let payload: { type: string; audio?: string };
          try { payload = JSON.parse(ev.data); } catch { return; }
          if (payload.type !== "speech.audio.delta" || !payload.audio) return;
          const bin = atob(payload.audio);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          playChunk(bytes);
        },
      });
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(value);
      }
      // wait for tail to finish playing
      const tail = Math.max(0, playheadRef.current - ctx.currentTime);
      window.setTimeout(() => {
        if (sourcesRef.current.length === 0) {
          if (ampTimerRef.current) { window.clearInterval(ampTimerRef.current); ampTimerRef.current = null; }
          setAmplitude(0);
          setIsSpeaking(false);
        }
      }, tail * 1000 + 300);
    } catch {
      cancel();
    }
  }, [cancel, getToken]);

  React.useEffect(() => () => {
    cancel();
    try { recRef.current?.stop(); } catch {/* */}
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [cancel]);

  return { startRecording, stopRecording, isRecording, speak, cancel, isSpeaking, amplitude };
}

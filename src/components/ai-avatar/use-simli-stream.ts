import * as React from "react";
// simli-client@3.0.2 index.js incorrectly requires "./Client" (capital C) but ships "./client.js".
// Import from the actual file path to bypass the broken barrel.
import { SimliClient } from "simli-client/dist/client";
import { createParser } from "eventsource-parser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Status = "idle" | "connecting" | "live" | "error" | "closed";

// Module-level cross-instance gates — same pattern as use-did-stream.ts.
// These coordinate session teardown/start across remounts (StrictMode,
// popup close→reopen) so Simli's slot is released before a new session
// is requested.
let lastSimliSessionDestroy: Promise<void> | null = null;
let simliOperationLock: Promise<void> | null = null;

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token || (typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null);
  return t
    ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

/**
 * Downsample PCM16LE 24kHz mono → 16kHz mono.
 * Returns the downsampled bytes plus any unread tail-sample carry-over.
 */
function downsample24kTo16k(
  input: Int16Array,
  carry: Int16Array,
): { out: Int16Array<ArrayBuffer>; nextCarry: Int16Array<ArrayBuffer> } {
  const mergedAb = new ArrayBuffer((carry.length + input.length) * 2);
  const merged = new Int16Array(mergedAb);
  merged.set(carry, 0);
  merged.set(input, carry.length);

  const outLen = Math.floor(merged.length / 1.5);
  const out = new Int16Array(new ArrayBuffer(outLen * 2));
  for (let i = 0; i < outLen; i++) {
    const pos = i * 1.5;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, merged.length - 1);
    const frac = pos - i0;
    out[i] = (merged[i0] * (1 - frac) + merged[i1] * frac) | 0;
  }
  const consumed = Math.floor(outLen * 1.5);
  const carryLen = merged.length - consumed;
  const carryAb = new ArrayBuffer(carryLen * 2);
  const nextCarry = new Int16Array(carryAb);
  nextCarry.set(merged.subarray(consumed));
  return { out, nextCarry };
}

/**
 * Real-time Simli avatar stream over WebRTC. Mirrors useDidStream's
 * lifecycle: panel owns the hook, connect/close are gated by module-level
 * lock + per-call lifecycle tokens, no inline retry loops.
 */
export function useSimliStream() {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const clientRef = React.useRef<SimliClient | null>(null);
  const voiceIdRef = React.useRef<string | null>(null);
  const connectingRef = React.useRef<Promise<void> | null>(null);
  const cleanupRef = React.useRef<Promise<void> | null>(null);
  const lifecycleRef = React.useRef(0);
  const speakAbortRef = React.useRef<AbortController | null>(null);
  const speakQueueRef = React.useRef<Promise<void>>(Promise.resolve());
  const speechRunIdRef = React.useRef(0);
  const [status, setStatus] = React.useState<Status>("idle");
  const [hasVideo, setHasVideo] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const speakActiveRef = React.useRef(0);


  const markVideoReady = React.useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const stream = video.srcObject instanceof MediaStream ? video.srcObject : null;
    const hasLiveTrack = Boolean(stream?.getVideoTracks().some((track) => track.readyState === "live"));
    if (hasLiveTrack || video.videoWidth > 0 || video.readyState >= 2) {
      setHasVideo(true);
      setStatus("live");
      video.play().catch(() => { /* autoplay may already be satisfied by muted/gesture */ });
    }
  }, []);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onReady = () => markVideoReady();
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("playing", onReady);
    let frameHandle = 0;
    let timer: ReturnType<typeof setInterval> | null = null;
    const requestFrame = () => {
      markVideoReady();
      const frameVideo = video as HTMLVideoElement & {
        requestVideoFrameCallback?: (callback: () => void) => number;
        cancelVideoFrameCallback?: (handle: number) => void;
      };
      if (frameVideo.requestVideoFrameCallback) {
        frameHandle = frameVideo.requestVideoFrameCallback(() => {
          markVideoReady();
          requestFrame();
        });
      }
    };
    requestFrame();
    timer = setInterval(markVideoReady, 500);
    return () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("playing", onReady);
      const frameVideo = video as HTMLVideoElement & { cancelVideoFrameCallback?: (handle: number) => void };
      if (frameHandle && frameVideo.cancelVideoFrameCallback) frameVideo.cancelVideoFrameCallback(frameHandle);
      if (timer) clearInterval(timer);
    };
  }, [markVideoReady]);

  const cleanup = React.useCallback(async (nextStatus: Status = "closed") => {
    lifecycleRef.current += 1;
    speechRunIdRef.current += 1;
    if (cleanupRef.current) return cleanupRef.current;
    try { speakAbortRef.current?.abort(); } catch { /* noop */ }
    speakAbortRef.current = null;
    speakQueueRef.current = Promise.resolve();
    speakActiveRef.current = 0;
    setSpeaking(false);
    connectingRef.current = null;

    const client = clientRef.current;
    clientRef.current = null;
    voiceIdRef.current = null;
    // Stop local media tracks BEFORE client.stop() so Simli's peer slot
    // releases as fast as possible.
    try {
      const v = videoRef.current;
      if (v?.srcObject instanceof MediaStream) {
        for (const t of v.srcObject.getTracks()) { try { t.stop(); } catch { /* noop */ } }
        v.srcObject = null;
      }
      const a = audioRef.current;
      if (a?.srcObject instanceof MediaStream) {
        for (const t of a.srcObject.getTracks()) { try { t.stop(); } catch { /* noop */ } }
        a.srcObject = null;
      }
    } catch { /* noop */ }
    setHasVideo(false);
    const run = (async () => {
      if (client) {
        lastSimliSessionDestroy = (async () => { try { await client.stop(); } catch { /* ignore */ } })();
        await lastSimliSessionDestroy;
      }
      setStatus(nextStatus);
    })();
    cleanupRef.current = run;
    try { await run; } finally { cleanupRef.current = null; }
  }, []);

  const restoreAudio = React.useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = false;
    const stream = a.srcObject instanceof MediaStream ? a.srcObject : null;
    stream?.getAudioTracks().forEach((track) => { track.enabled = true; });
    a.play().catch(() => { /* autoplay may already be satisfied */ });
  }, []);

  const connect = React.useCallback(async () => {
    if (clientRef.current) return; // already connected
    if (connectingRef.current) return connectingRef.current; // dedupe concurrent
    if (!videoRef.current || !audioRef.current) return;
    const token = lifecycleRef.current + 1;
    lifecycleRef.current = token;
    setStatus("connecting");
    const previousOperation = simliOperationLock;
    const run = (async () => {
      let createdClient: SimliClient | null = null;
      try {
        if (previousOperation) await previousOperation;
        if (lastSimliSessionDestroy) await lastSimliSessionDestroy;
        if (lifecycleRef.current !== token) throw new Error("Avatar connection cancelled");

        const res = await fetch("/api/ai/simli", {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify({ action: "start-session" }),
        });
        const json = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        if (lifecycleRef.current !== token) throw new Error("Avatar connection cancelled");

        const { sessionToken, iceServers, voiceId } = json as {
          sessionToken: string;
          iceServers: RTCIceServer[];
          voiceId?: string | null;
        };
        voiceIdRef.current = voiceId ?? null;

        const client = new SimliClient(
          sessionToken,
          videoRef.current!,
          audioRef.current!,
          Array.isArray(iceServers) && iceServers.length ? iceServers : null,
        );
        createdClient = client;
        client.on("start", () => {
          markVideoReady();
          window.setTimeout(markVideoReady, 150);
        });
        client.on("error", (detail: string) => {
          // eslint-disable-next-line no-console
          console.warn("[simli] error", detail);
        });
        await client.start();
        if (lifecycleRef.current !== token) {
          lastSimliSessionDestroy = (async () => { try { await client.stop(); } catch { /* ignore */ } })();
          await lastSimliSessionDestroy;
          throw new Error("Avatar connection cancelled");
        }

        clientRef.current = client;
        setStatus("live");
        markVideoReady();
        window.setTimeout(markVideoReady, 250);
      } catch (e: any) {
        if (/Avatar connection cancelled/i.test(e?.message || "")) {
          if (createdClient && clientRef.current !== createdClient) {
            try { await createdClient.stop(); } catch { /* ignore */ }
          }
          if (lifecycleRef.current === token) setStatus("closed");
          return;
        }
        const msg = e?.message || "Salone connect failed";
        const friendly = /max user sessions|concurrent/i.test(msg)
          ? "Salone live session limit reached. Please wait a moment and reload — an old session is still active."
          : /INVALID_FACE_ID/i.test(msg)
          ? "The avatar face is still processing (or invalid). If you just uploaded it, please wait a few minutes for Simli to finish processing and try again."
          : msg;
        toast.error(friendly);
        await cleanup("error");
        throw e;
      }
    })();
    connectingRef.current = run;
    const operation = run.catch(() => { /* keep the global lock from becoming an unhandled rejection */ });
    simliOperationLock = operation;
    operation.finally(() => {
      if (simliOperationLock === operation) simliOperationLock = null;
    });
    try { await run; } finally { connectingRef.current = null; }
  }, [cleanup, markVideoReady]);

  const speak = React.useCallback(async (text: string) => {
    const clean = (text || "").trim();
    if (!clean) return;
    const runId = speechRunIdRef.current;
    if (!clientRef.current) {
      await connect();
    }
    if (runId !== speechRunIdRef.current) return;
    const client = clientRef.current;
    if (!client) return;
    restoreAudio();

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token || (typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null);
    if (!token) { toast.error("Sign in to use the avatar"); return; }
    if (runId !== speechRunIdRef.current) return;

    // Queue speak calls so streamed sentences play sequentially instead of
    // aborting each other (which would only play the last sentence).
    speakActiveRef.current += 1;
    setSpeaking(true);
    const task = speakQueueRef.current.then(async () => {
      if (runId !== speechRunIdRef.current) return;
      const activeClient = clientRef.current;
      if (!activeClient) return;
      const ac = new AbortController();
      speakAbortRef.current = ac;
      try {
        const res = await fetch("/api/ai/speak", {
          method: "POST",
          signal: ac.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text: clean.slice(0, 4000), voice: voiceIdRef.current || undefined }),
        });
        if (!res.ok || !res.body) {
          toast.error(`TTS failed (${res.status})`);
          return;
        }
        let carry: Int16Array<ArrayBuffer> = new Int16Array(new ArrayBuffer(0));
        let byteCarry = new Uint8Array(0);

        const flushChunk = (pcm24Bytes: Uint8Array) => {
          if (ac.signal.aborted || runId !== speechRunIdRef.current) return;
          const merged = new Uint8Array(byteCarry.length + pcm24Bytes.length);
          merged.set(byteCarry, 0);
          merged.set(pcm24Bytes, byteCarry.length);
          const usable = merged.length - (merged.length % 2);
          byteCarry = merged.slice(usable);
          if (usable === 0) return;
          const ab = new ArrayBuffer(usable);
          new Uint8Array(ab).set(merged.subarray(0, usable));
          const samples = new Int16Array(ab);
          const { out, nextCarry } = downsample24kTo16k(samples, carry);
          carry = nextCarry;
          if (out.length === 0) return;
          const bytes = new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
          try { activeClient.sendAudioData(bytes); } catch (err) {
            // eslint-disable-next-line no-console
            console.warn("[simli] sendAudioData failed", err);
          }
        };

        const parser = createParser({
          onEvent(ev) {
            if (ac.signal.aborted || runId !== speechRunIdRef.current) return;
            let payload: { type: string; audio?: string };
            try { payload = JSON.parse(ev.data); } catch { return; }
            if (payload.type !== "speech.audio.delta" || !payload.audio) return;
            const bin = atob(payload.audio);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            flushChunk(bytes);
          },
        });

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        while (true) {
          if (ac.signal.aborted || runId !== speechRunIdRef.current) { try { await reader.cancel(); } catch { /* noop */ } break; }
          const { value, done } = await reader.read();
          if (done) break;
          parser.feed(value);
        }
        if (!ac.signal.aborted && runId === speechRunIdRef.current && byteCarry.length > 0) {
          flushChunk(new Uint8Array([0]));
        }
        if (!ac.signal.aborted && runId === speechRunIdRef.current && carry.length > 0) {
          const { out } = downsample24kTo16k(new Int16Array(new ArrayBuffer(4)), carry);
          if (out.length > 0) {
            const bytes = new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
            try { activeClient.sendAudioData(bytes); } catch { /* noop */ }
          }
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          // eslint-disable-next-line no-console
          console.warn("[simli] speak failed", e);
        }
      } finally {
        if (speakAbortRef.current === ac) speakAbortRef.current = null;
        if (runId === speechRunIdRef.current) {
          speakActiveRef.current = Math.max(0, speakActiveRef.current - 1);
          if (speakActiveRef.current === 0) setSpeaking(false);
        }
      }
    });
    speakQueueRef.current = task.catch(() => { /* swallow so queue keeps moving */ });
    return task;
  }, [connect, restoreAudio]);

  const stopSpeaking = React.useCallback(() => {
    speechRunIdRef.current += 1;
    try { speakAbortRef.current?.abort(); } catch { /* noop */ }
    speakAbortRef.current = null;
    speakQueueRef.current = Promise.resolve();
    speakActiveRef.current = 0;
    setSpeaking(false);
    // Tell Simli server to skip buffered audio frames — stops voice and
    // lip-sync movement without tearing down the WebRTC session.
    for (let i = 0; i < 4; i += 1) {
      try { clientRef.current?.ClearBuffer(); } catch { /* noop */ }
    }
    // Silence any audio already buffered locally. restoreAudio() in the next
    // speak() call will unmute and re-enable tracks for the new reply.
    const a = audioRef.current;
    if (a) {
      try { a.pause(); } catch { /* noop */ }
      a.muted = true;
      const stream = a.srcObject instanceof MediaStream ? a.srcObject : null;
      stream?.getAudioTracks().forEach((t) => { t.enabled = false; });
    }
  }, []);


  const close = React.useCallback(() => cleanup("closed"), [cleanup]);

  return { videoRef, audioRef, connect, speak, stopSpeaking, close, status, hasVideo, speaking };

}

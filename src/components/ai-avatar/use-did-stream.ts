import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Status = "idle" | "connecting" | "live" | "error" | "closed";

let lastDidSessionDestroy: Promise<void> | null = null;
let didOperationLock: Promise<void> | null = null;

const VOICE_BY_LANG: Record<string, string> = {
  en: "en-US-GuyNeural",
  hi: "hi-IN-MadhurNeural",
  ar: "ar-AE-HamdanNeural",
  gu: "gu-IN-NiranjanNeural",
};


async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token || (typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null);
  return t
    ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function call(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch("/api/ai/did", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.error || `HTTP ${res.status}`);
  return json as any;
}

/**
 * Real-time D-ID Talks Stream over WebRTC.
 * The video element produced here should be attached via `videoRef`.
 */
export function useDidStream(opts?: { lang?: string }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const streamIdRef = React.useRef<string | null>(null);
  const sessionIdRef = React.useRef<string | null>(null);
  const idleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const connectingRef = React.useRef<Promise<void> | null>(null);
  const cleanupRef = React.useRef<Promise<void> | null>(null);
  const lifecycleRef = React.useRef(0);
  const [status, setStatus] = React.useState<Status>("idle");
  const [speaking, setSpeaking] = React.useState(false);
  const [hasVideo, setHasVideo] = React.useState(false);
  const cleanup = React.useCallback(async (nextStatus: Status = "closed") => {
    lifecycleRef.current += 1;
    if (cleanupRef.current) return cleanupRef.current;
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    connectingRef.current = null;
    const pc = pcRef.current;
    const id = streamIdRef.current;
    const session = sessionIdRef.current;
    pcRef.current = null;
    streamIdRef.current = null;
    sessionIdRef.current = null;
    try { pc?.getReceivers().forEach((r) => r.track?.stop()); } catch { /* ignore */ }
    try { pc?.close(); } catch { /* ignore */ }
    try { mediaStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    mediaStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setHasVideo(false);
    const run = (async () => {
      if (id && session) {
        lastDidSessionDestroy = call("destroy", { id, session_id: session }).catch(() => { /* ignore */ });
        await lastDidSessionDestroy;
      }
      setSpeaking(false);
      setStatus(nextStatus);
    })();
    cleanupRef.current = run;
    try { await run; } finally { cleanupRef.current = null; }
  }, []);


  // Idle close disabled — session must persist across tab switches until logout.
  const scheduleIdleClose = React.useCallback(() => { /* no-op */ }, []);


  const connect = React.useCallback(async () => {
    if (pcRef.current && streamIdRef.current) return; // already connected
    if (connectingRef.current) return connectingRef.current; // dedupe concurrent calls (StrictMode, remounts)
    const token = lifecycleRef.current + 1;
    lifecycleRef.current = token;
    setStatus("connecting");
    const previousOperation = didOperationLock;
    const run = (async () => {
      if (previousOperation) await previousOperation;
      if (lastDidSessionDestroy) await lastDidSessionDestroy;
      if (lifecycleRef.current !== token) throw new Error("Avatar connection cancelled");
      let createdId: string | null = null;
      let createdSession: string | null = null;
      let createdPc: RTCPeerConnection | null = null;

      try {
        const created = await call("create");
        const { id, session_id, offer, ice_servers } = created;
        createdId = id;
        createdSession = session_id;

        if (lifecycleRef.current !== token) {
          lastDidSessionDestroy = call("destroy", { id, session_id }).catch(() => { /* ignore */ });
          await lastDidSessionDestroy;
          throw new Error("Avatar connection cancelled");
        }

        streamIdRef.current = id;
        sessionIdRef.current = session_id;

        const pc = new RTCPeerConnection({ iceServers: ice_servers });
        pcRef.current = pc;
        createdPc = pc;

        // Tell the PC we expect to receive both audio and video.
        try {
          pc.addTransceiver("audio", { direction: "recvonly" });
          pc.addTransceiver("video", { direction: "recvonly" });
        } catch { /* some browsers add via SDP */ }

        // Merge incoming tracks into a single MediaStream so audio + video
        // play together on the same <video> element.
        const combined = new MediaStream();
        mediaStreamRef.current = combined;

      pc.addEventListener("track", (e) => {
        const track = e.track;
        if (!track) return;
        try { combined.addTrack(track); } catch { /* dup */ }
        if (videoRef.current && videoRef.current.srcObject !== combined) {
          videoRef.current.srcObject = combined;
        }
        if (track.kind === "video") {
          setHasVideo(true);
          setStatus("live");
        }
        videoRef.current?.play().catch(() => { /* autoplay blocked */ });
        track.addEventListener("ended", () => {
          if (track.kind === "video") setHasVideo(false);
        });
      });

      pc.addEventListener("icecandidate", (e) => {
        if (!streamIdRef.current || !sessionIdRef.current) return;
        if (e.candidate) {
          call("ice", {
            id: streamIdRef.current,
            session_id: sessionIdRef.current,
            candidate: e.candidate.candidate,
            sdpMid: e.candidate.sdpMid,
            sdpMLineIndex: e.candidate.sdpMLineIndex,
          }).catch(() => { /* ignore trickle errors */ });
        } else {
          call("ice", { id: streamIdRef.current, session_id: sessionIdRef.current }).catch(() => {/* ignore */});
        }
      });

      pc.addEventListener("iceconnectionstatechange", () => {
        const s = pc.iceConnectionState;
        if (s === "connected" || s === "completed") setStatus("live");
        if (s === "failed") setStatus("error");
      });

      pc.addEventListener("connectionstatechange", () => {
        const s = pc.connectionState;
        if (s === "connected") setStatus("live");
        if (s === "failed" || s === "disconnected" || s === "closed") {
          setSpeaking(false);
          if (s === "failed") setStatus("error");
        }
      });


      // D-ID sends speaking events via data channel "JanusDataChannel"
      pc.addEventListener("datachannel", (e) => {
        e.channel.addEventListener("message", (ev) => {
          const data = typeof ev.data === "string" ? ev.data : "";
          if (data.startsWith("stream/started")) setSpeaking(true);
          else if (data.startsWith("stream/done") || data.startsWith("stream/ready")) setSpeaking(false);
        });
      });

      await pc.setRemoteDescription(offer);
      if (lifecycleRef.current !== token) throw new Error("Avatar connection cancelled");
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (lifecycleRef.current !== token) throw new Error("Avatar connection cancelled");
      await call("sdp", { id, session_id, answer: { type: answer.type, sdp: answer.sdp } });
      if (lifecycleRef.current !== token) throw new Error("Avatar connection cancelled");
      scheduleIdleClose();
    } catch (e: any) {
      if (/Avatar connection cancelled/i.test(e?.message || "")) {
        try { createdPc?.getReceivers().forEach((r) => r.track?.stop()); } catch { /* ignore */ }
        try { createdPc?.close(); } catch { /* ignore */ }
        if (streamIdRef.current === createdId) streamIdRef.current = null;
        if (sessionIdRef.current === createdSession) sessionIdRef.current = null;
        if (pcRef.current === createdPc) pcRef.current = null;
        if (createdId && createdSession) {
          lastDidSessionDestroy = call("destroy", { id: createdId, session_id: createdSession }).catch(() => { /* ignore */ });
          await lastDidSessionDestroy;
        }
        if (lifecycleRef.current === token) setStatus("closed");
        return;
      }
      const msg = e?.message || "Avatar connect failed";
      const friendly = /max user sessions/i.test(msg)
        ? "D-ID live session limit reached. Please wait a moment and reload — an old session is still active."
        : msg;
      toast.error(friendly);
      await cleanup("error");
      throw e;
    }
    })();
    connectingRef.current = run;
    const operation = run.catch(() => { /* keep the global lock from becoming an unhandled rejection */ });
    didOperationLock = operation;
    operation.finally(() => {
      if (didOperationLock === operation) didOperationLock = null;
    });
    try { await run; } finally { connectingRef.current = null; }
  }, [cleanup, scheduleIdleClose]);


  const speak = React.useCallback(async (text: string) => {
    const clean = (text || "").trim();
    if (!clean) return;
    try {
      if (!pcRef.current || !streamIdRef.current || !sessionIdRef.current) {
        await connect();
      }
      const id = streamIdRef.current!;
      const session_id = sessionIdRef.current!;
      const voice_id = VOICE_BY_LANG[(opts?.lang || "en") as string] || VOICE_BY_LANG.en;
      await call("talk", { id, session_id, text: clean, voice_id });
      scheduleIdleClose();
    } catch (e: any) {
      toast.error(e?.message || "Avatar speak failed");
    }
  }, [connect, scheduleIdleClose, opts?.lang]);

  // No unmount cleanup — D-ID session persists until explicit close() or logout.




  const close = React.useCallback(() => cleanup("closed"), [cleanup]);

  return { videoRef, connect, speak, status, speaking, hasVideo, close };
}

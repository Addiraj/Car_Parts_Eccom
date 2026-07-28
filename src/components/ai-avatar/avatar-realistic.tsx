import * as React from "react";
import { useDidStream } from "./use-did-stream";
import { Spinner } from "@/components/ui/spinner";
import { getActiveAvatarUrl } from "@/lib/admin.cms.functions";

export type AvatarRealisticHandle = {
  speak: (text: string) => Promise<void>;
  connect: () => Promise<void>;
  close: () => Promise<void>;
};

export type AvatarStatus = "idle" | "connecting" | "live" | "error";

const DEFAULT_PORTRAIT =
  "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg";

/**
 * Realistic avatar driven by D-ID Talks Streams (WebRTC, live only).
 * Shows the configured static portrait until the first talk streams real
 * frames, then switches to the live video for lip-sync.
 */
export const AvatarRealistic = React.forwardRef<
  AvatarRealisticHandle,
  { amplitude?: number; speaking?: boolean; lang?: string; onStatusChange?: (s: AvatarStatus) => void }
>(function AvatarRealistic({ lang, onStatusChange }, ref) {
  const did = useDidStream({ lang });
  const [portraitUrl, setPortraitUrl] = React.useState<string>(DEFAULT_PORTRAIT);
  const [hasSpoken, setHasSpoken] = React.useState(false);
  const [videoReady, setVideoReady] = React.useState(false);

  // Wrap speak so we flip to live video on first call.
  const speak = React.useCallback(async (text: string) => {
    setHasSpoken(true);
    await did.speak(text);
  }, [did.speak]);

  React.useImperativeHandle(ref, () => ({
    speak,
    connect: did.connect,
    close: did.close,
  }), [speak, did.connect, did.close]);

  // Load configured portrait once.
  React.useEffect(() => {
    let cancelled = false;
    getActiveAvatarUrl()
      .then((r) => { if (!cancelled && r?.url) setPortraitUrl(r.url); })
      .catch(() => { /* keep default */ });
    return () => { cancelled = true; };
  }, []);

  // Connect on mount (panel open) and tear down on unmount (panel close).
  // The panel owns the session lifecycle.
  React.useEffect(() => {
    did.connect().catch(() => { /* surfaced via toast */ });
    return () => {
      did.close().catch(() => { /* noop */ });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  React.useEffect(() => {
    if (!did.hasVideo) setVideoReady(false);
  }, [did.hasVideo]);

  React.useEffect(() => {
    onStatusChange?.(did.status as AvatarStatus);
  }, [did.status, onStatusChange]);

  const showVideo = hasSpoken && did.hasVideo && videoReady;
  const showPortrait = !showVideo && (did.status === "live" || did.status === "connecting" || !hasSpoken);
  const showSpinner = did.status === "connecting" || did.status === "error";

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#05070d]">
      <div
        className="absolute inset-0 transition-opacity duration-200 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 55%, rgba(59,130,246,0.45) 0%, rgba(5,7,13,0) 70%)",
          opacity: did.speaking ? 0.9 : 0.4,
        }}
      />

      <video
        ref={did.videoRef}
        autoPlay
        playsInline
        muted={false}
        onLoadedData={() => setVideoReady(true)}
        onPlaying={() => setVideoReady(true)}
        className="absolute inset-0 h-full w-full object-contain"
        style={{ opacity: showVideo ? 1 : 0 }}
      />

      {showPortrait ? (
        <img
          src={portraitUrl}
          alt="Avatar"
          className="absolute inset-0 h-full w-full object-contain pointer-events-none"
        />
      ) : null}

      {showSpinner && !showVideo ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#05070d]/60 backdrop-blur-sm">
          <Spinner className="size-8 text-blue-400" />
          <p className="text-xs font-medium text-white/70">
            {did.status === "error" ? "Live avatar unavailable — retrying…" : "Connecting to live avatar…"}
          </p>
        </div>
      ) : null}

    </div>
  );
});

import * as React from "react";
import { useSimliStream } from "./use-simli-stream";
import { Spinner } from "@/components/ui/spinner";
import { Square } from "lucide-react";

export type AvatarSimliHandle = {
  speak: (text: string) => Promise<void>;
  connect: () => Promise<void>;
  close: () => Promise<void>;
  stopSpeaking: () => void;
};


type Status = "idle" | "connecting" | "live" | "error";

type Props = {
  imageUrl: string | null;
  faceId?: string | null;
  active?: boolean;
  onStatusChange?: (s: Status) => void;
};

/**
 * Simli realistic avatar — thin view over useSimliStream. Mirrors
 * avatar-realistic.tsx: connect on mount, close on unmount, static admin
 * portrait until the first live frame arrives.
 */
export const AvatarSimli = React.forwardRef<AvatarSimliHandle, Props>(function AvatarSimli(
  { imageUrl, onStatusChange },
  ref,
) {
  const simli = useSimliStream();

  React.useImperativeHandle(
    ref,
    () => ({ speak: simli.speak, connect: simli.connect, close: simli.close, stopSpeaking: simli.stopSpeaking }),
    [simli.speak, simli.connect, simli.close, simli.stopSpeaking],
  );


  // Panel owns lifecycle: connect on mount, close on unmount.
  React.useEffect(() => {
    simli.connect().catch(() => { /* surfaced via toast */ });
    return () => {
      simli.close().catch(() => { /* noop */ });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const effective: Status =
      simli.status === "live" && !simli.hasVideo
        ? "connecting"
        : (simli.status === "closed" ? "idle" : (simli.status as Status));
    onStatusChange?.(effective);
  }, [simli.status, simli.hasVideo, onStatusChange]);

  const showVideo = simli.hasVideo;
  const showSpinner = !showVideo && simli.status === "connecting";

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#05070d]">
      <video
        ref={simli.videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${showVideo ? "opacity-100" : "opacity-0"}`}
      />
      <audio ref={simli.audioRef} autoPlay />

      {simli.speaking ? (
        <button
          type="button"
          onClick={() => simli.stopSpeaking()}
          className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full bg-red-500/90 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg backdrop-blur hover:bg-red-500"
          aria-label="Stop speaking"
        >
          <Square className="h-3 w-3 fill-current" /> Stop
        </button>
      ) : null}


      {!showVideo && imageUrl ? (
        <img
          src={imageUrl}
          alt="Avatar"
          className="absolute inset-0 h-full w-full object-contain pointer-events-none"
        />
      ) : null}

      {!showVideo && !imageUrl && simli.status !== "connecting" ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-white/50">
          No Salone face configured
        </div>
      ) : null}

      {showSpinner ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#05070d]/55 backdrop-blur-sm">
          <Spinner className="size-8 text-blue-400" />
          <p className="text-xs font-medium text-white/70">Connecting to Salone…</p>
        </div>
      ) : null}

      {simli.status === "error" ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#05070d]/60 backdrop-blur-sm text-center px-4">
          <p className="text-xs font-medium text-red-300">Salone session unavailable</p>
          <button
            onClick={() => { void simli.close().then(() => simli.connect()); }}
            className="rounded bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
});

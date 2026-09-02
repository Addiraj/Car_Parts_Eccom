"use client";

import * as React from "react";
import { Camera, X, Circle } from "lucide-react";

interface CameraModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

/**
 * Opens a live camera stream (works on laptop webcam + mobile camera).
 * User can snap a photo which is returned as a File.
 */
export function CameraModal({ open, onClose, onCapture }: CameraModalProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [ready, setReady] = React.useState(false);
  const [facingMode, setFacingMode] = React.useState<"environment" | "user">("environment");
  const [error, setError] = React.useState<string | null>(null);

  const startCamera = React.useCallback(async (mode: "environment" | "user") => {
    // Stop existing stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setReady(false);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      startCamera(facingMode);
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setReady(false);
      setError(null);
    }
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [open, facingMode, startCamera]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !ready) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file);
      onClose();
    }, "image/jpeg", 0.92);
  };

  const toggleCamera = () => {
    setFacingMode((m) => (m === "environment" ? "user" : "environment"));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden bg-black shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/60 absolute top-0 left-0 right-0 z-10">
          <span className="text-white text-sm font-semibold flex items-center gap-2">
            <Camera className="h-4 w-4" /> Camera
          </span>
          <div className="flex items-center gap-2">
            {/* Flip camera button (useful on mobile) */}
            <button
              onClick={toggleCamera}
              className="text-white/70 hover:text-white text-xs px-2 py-1 rounded-md border border-white/20 hover:border-white/50 transition"
              title="Flip camera"
            >
              ↺ Flip
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Video stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-video object-cover bg-black"
        />

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <p className="text-white/70 text-sm text-center px-6">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Capture button */}
        <div className="flex justify-center items-center py-5 bg-black/80">
          <button
            onClick={handleCapture}
            disabled={!ready}
            className="relative flex items-center justify-center w-16 h-16 rounded-full bg-white hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-transform active:scale-95 shadow-lg"
            title="Take photo"
          >
            <Circle className="h-10 w-10 text-black fill-black" />
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

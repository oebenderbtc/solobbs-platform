"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, SwitchCamera, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Facing = "user" | "environment";

export function ChatCameraCapture({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>("environment");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      stopStream();
      setReady(false);
      setError("");
      return;
    }
    void startCamera(facing);
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only on open/facing
  }, [open, facing]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startCamera(mode: Facing) {
    setStarting(true);
    setError("");
    setReady(false);
    stopStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Tu navegador no permite usar la cámara. Prueba con Chrome o Safari actualizado.",
      );
      setStarting(false);
      return;
    }

    try {
      // Explicit permission prompt (desktop + mobile browsers)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setReady(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError(
          "Permiso de cámara denegado. Actívalo en la barra del navegador (ícono de candado) y vuelve a intentar.",
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("No se detectó ninguna cámara en este dispositivo.");
      } else if (name === "NotReadableError") {
        setError("La cámara está en uso por otra aplicación.");
      } else {
        setError("No se pudo abrir la cámara. Revisa los permisos del navegador.");
      }
    } finally {
      setStarting(false);
    }
  }

  function snap() {
    const video = videoRef.current;
    if (!video || !ready) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `foto-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        stopStream();
        onCapture(file);
        onClose();
      },
      "image/jpeg",
      0.92,
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-sm font-medium text-cream">Cámara</p>
        <button
          type="button"
          onClick={() => {
            stopStream();
            onClose();
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-cream"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-3">
        {starting && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-mist">
            <Loader2 className="h-8 w-8 animate-spin text-champagne" />
            <p className="text-sm">Pidiendo permiso de cámara…</p>
          </div>
        )}
        {error ? (
          <div className="max-w-sm space-y-4 rounded-2xl border border-line bg-ink-elevated p-5 text-center">
            <Camera className="mx-auto h-8 w-8 text-blush" />
            <p className="text-sm text-cream">{error}</p>
            <button
              type="button"
              onClick={() => void startCamera(facing)}
              className="btn-primary w-full !py-2.5 text-sm"
            >
              Reintentar permiso
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={cn(
              "max-h-[70vh] w-full rounded-2xl bg-ink object-cover",
              !ready && "opacity-0",
            )}
          />
        )}
      </div>

      <div className="flex items-center justify-center gap-6 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={!ready || !!error}
          onClick={() =>
            setFacing((f) => (f === "environment" ? "user" : "environment"))
          }
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-cream disabled:opacity-40"
          aria-label="Cambiar cámara"
        >
          <SwitchCamera className="h-5 w-5" />
        </button>
        <button
          type="button"
          disabled={!ready || !!error}
          onClick={snap}
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-cream bg-gradient-to-br from-champagne to-blush disabled:opacity-40"
          aria-label="Tomar foto"
        >
          <span className="h-12 w-12 rounded-full bg-cream/20" />
        </button>
        <span className="inline-block h-12 w-12" aria-hidden />
      </div>
    </div>
  );
}

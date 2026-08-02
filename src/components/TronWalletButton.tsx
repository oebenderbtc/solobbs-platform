"use client";

import { useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type TronProvider = {
  request: (args: {
    method: string;
    params?: Record<string, unknown>;
  }) => Promise<unknown>;
  tronWeb?: {
    defaultAddress?: { base58?: string };
    trx?: {
      signMessageV2?: (msg: string) => Promise<string>;
    };
  };
};

declare global {
  interface Window {
    tronLink?: TronProvider;
    tronWeb?: TronProvider["tronWeb"] & {
      ready?: boolean;
      defaultAddress?: { base58?: string };
      trx?: { signMessageV2?: (msg: string) => Promise<string> };
    };
  }
}

async function getTronAddress(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Solo disponible en el navegador");
  }

  if (window.tronLink?.request) {
    try {
      await window.tronLink.request({ method: "tron_requestAccounts" });
    } catch {
      // user may already be connected
    }
  }

  // TronLink injects tronWeb after approval; wait briefly
  for (let i = 0; i < 20; i++) {
    const addr =
      window.tronWeb?.defaultAddress?.base58 ||
      window.tronLink?.tronWeb?.defaultAddress?.base58;
    if (addr) return addr;
    await new Promise((r) => setTimeout(r, 150));
  }

  throw new Error(
    "No se detectó TronLink. Instala la extensión o abre la app wallet TRON.",
  );
}

async function signTronMessage(message: string, address: string) {
  const tronWeb = window.tronWeb || window.tronLink?.tronWeb;
  if (tronWeb?.trx?.signMessageV2) {
    return tronWeb.trx.signMessageV2(message);
  }
  if (window.tronLink?.request) {
    const sig = await window.tronLink.request({
      method: "tron_signMessage",
      // some wallets expect hex; TronLink often accepts plain message
      params: { message, address },
    });
    if (typeof sig === "string") return sig;
    if (sig && typeof sig === "object" && "signature" in sig) {
      return String((sig as { signature: string }).signature);
    }
  }
  throw new Error("Tu wallet no soporta firmar mensajes");
}

export function TronWalletButton({
  mode,
  role,
  onSuccess,
  onError,
  className,
  label,
  loadingLabel,
}: {
  mode: "login" | "register";
  role?: "MODEL" | "CLIENT";
  onSuccess: (payload: {
    tronAddress: string;
    signature: string;
    nonce: string;
    message: string;
  }) => Promise<void> | void;
  onError: (message: string) => void;
  className?: string;
  label: string;
  loadingLabel: string;
}) {
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    try {
      const address = await getTronAddress();
      const nonceRes = await fetch("/api/auth/tron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nonce", address }),
      });
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok) {
        throw new Error(nonceData.error || "No se pudo iniciar con TRON");
      }

      const signature = await signTronMessage(nonceData.message, address);
      await onSuccess({
        tronAddress: address,
        signature,
        nonce: nonceData.nonce,
        message: nonceData.message,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error con TronLink");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={connect}
      className={cn(
        "btn-ghost flex w-full items-center justify-center gap-2 !py-3",
        className,
      )}
      aria-label={`${label}${role ? ` (${role})` : ""} (${mode})`}
    >
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> {loadingLabel}
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4 text-champagne" /> {label}
        </>
      )}
    </button>
  );
}

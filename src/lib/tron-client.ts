"use client";

import type { TronWebLike } from "@/types/tron";

const USDT_TRC20 =
  process.env.NEXT_PUBLIC_TRON_USDT_CONTRACT ||
  "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

export async function connectTronWallet(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Solo en el navegador");
  }
  if (window.tronLink?.request) {
    try {
      await window.tronLink.request({ method: "tron_requestAccounts" });
    } catch {
      // already connected / rejected
    }
  }
  for (let i = 0; i < 25; i++) {
    const addr =
      window.tronWeb?.defaultAddress?.base58 ||
      window.tronLink?.tronWeb?.defaultAddress?.base58;
    if (addr) return addr;
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new Error("Abre TronLink e inicia sesión en tu wallet TRON");
}

function getTronWeb(): TronWebLike {
  const tw = window.tronWeb || window.tronLink?.tronWeb;
  if (!tw) throw new Error("TronLink no disponible");
  return tw;
}

/** Lock escrow: transfer USDT TRC20 to SoloBBs treasury via TronLink */
export async function tronLinkLockUsdt(opts: {
  toAddress: string;
  amountUsdt: number;
}): Promise<{ txId: string; fromAddress: string }> {
  const fromAddress = await connectTronWallet();
  const tronWeb = getTronWeb();
  if (!tronWeb.contract) {
    throw new Error("Tu TronLink no soporta contratos TRC20");
  }

  const amountSun = Math.round(opts.amountUsdt * 1_000_000);
  const contract = await tronWeb.contract().at(USDT_TRC20);
  const txId = await contract.transfer(opts.toAddress, amountSun).send({
    feeLimit: 100_000_000,
  });

  if (!txId || typeof txId !== "string") {
    throw new Error("No se obtuvo el hash de la transferencia");
  }
  return { txId, fromAddress };
}

/** Model authorizes release by signing a message with TronLink */
export async function tronLinkSignRelease(opts: {
  escrowId: string;
  amountUsdt: number;
  netUsdt: number;
}): Promise<{ address: string; signature: string; message: string }> {
  const address = await connectTronWallet();
  const tronWeb = getTronWeb();
  const message = [
    "SoloBBs — liberar escrow TRON",
    `Escrow: ${opts.escrowId}`,
    `Monto: ${opts.amountUsdt} USDT`,
    `Neto modelo: ${opts.netUsdt} USDT`,
    `Wallet: ${address}`,
  ].join("\n");

  if (!tronWeb.trx?.signMessageV2) {
    throw new Error("Tu wallet no puede firmar el release");
  }
  const signature = await tronWeb.trx.signMessageV2(message);
  return { address, signature, message };
}

import "server-only";
import { TronWeb } from "tronweb";
import {
  TRON_FULL_HOST,
  TRON_USDT_CONTRACT,
  tronEscrowDemoMode,
  usdtToSun,
} from "@/lib/tron-escrow";
import { mockTxHash } from "@/lib/crypto-format";
import { getGasWalletPrivateKey } from "@/lib/platform-wallets";

/**
 * Send USDT-TRC20 from platform gas/hot wallet to a destination.
 * Gas (TRX) is paid by that same wallet.
 */
export async function sendUsdtToAddress(opts: {
  toAddress: string;
  amountUsdt: number;
}): Promise<{ ok: true; txId: string; demo?: boolean } | { ok: false; error: string }> {
  const amount = opts.amountUsdt;
  if (!(amount > 0)) {
    return { ok: false, error: "Monto inválido" };
  }

  if (tronEscrowDemoMode()) {
    return { ok: true, txId: mockTxHash(""), demo: true };
  }

  const privateKey = await getGasWalletPrivateKey();
  if (!privateKey) {
    return {
      ok: false,
      error:
        "Wallet de gas no configurada. En Admin → Ajustes agrega la wallet de gas y su clave privada, o activa TRON_ESCROW_DEMO=true.",
    };
  }

  try {
    const tronWeb = new TronWeb({
      fullHost: TRON_FULL_HOST,
      privateKey,
      headers: process.env.TRONGRID_API_KEY
        ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY }
        : undefined,
    });

    const contract = await tronWeb.contract().at(TRON_USDT_CONTRACT);
    const sun = usdtToSun(amount);
    const txId = await contract.transfer(opts.toAddress, sun).send({
      feeLimit: 100_000_000,
    });

    if (!txId || typeof txId !== "string") {
      return { ok: false, error: "No se obtuvo hash de la transferencia" };
    }
    return { ok: true, txId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al enviar USDT",
    };
  }
}

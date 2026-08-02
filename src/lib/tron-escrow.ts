import "server-only";

/** USDT TRC20 mainnet */
export const TRON_USDT_CONTRACT =
  process.env.TRON_USDT_CONTRACT || "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

export const TRON_FULL_HOST =
  process.env.TRON_FULL_HOST || "https://api.trongrid.io";

/** Allow signed-message demo locks when no real USDT tx is available */
export function tronEscrowDemoMode() {
  // Never allow demo money shortcuts in production
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_TRON_DEMO !== "true") {
    return false;
  }
  return process.env.TRON_ESCROW_DEMO === "true";
}

export function usdtToSun(amountUsdt: number) {
  return Math.round(amountUsdt * 1_000_000);
}

export function sunToUsdt(sun: number) {
  return sun / 1_000_000;
}

type TronGridTxInfo = {
  id?: string;
  contractResult?: string[];
  receipt?: { result?: string };
  log?: Array<{
    address?: string;
    topics?: string[];
    data?: string;
  }>;
};

function hexAddressToBase58(hex: string): string | null {
  try {
    // lazy require to avoid bundling issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TronWeb } = require("tronweb") as typeof import("tronweb");
    const clean = hex.replace(/^0x/, "");
    if (clean.length === 40) {
      return TronWeb.address.fromHex(`41${clean}`);
    }
    if (clean.length === 42 && clean.startsWith("41")) {
      return TronWeb.address.fromHex(clean);
    }
    return TronWeb.address.fromHex(hex);
  } catch {
    return null;
  }
}

export async function fetchTronTxInfo(txId: string): Promise<TronGridTxInfo | null> {
  try {
    const res = await fetch(`${TRON_FULL_HOST}/wallet/gettransactioninfobyid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: txId }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TronGridTxInfo;
    if (!data?.id && !data?.receipt) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Verifies a TRC20 USDT transfer landed on the platform treasury/escrow address.
 * Looks at Transfer event logs (topic0 = Transfer hash).
 */
export async function verifyTronUsdtLock(opts: {
  txId: string;
  treasuryAddress: string;
  amountUsdt: number;
  fromAddress?: string | null;
}): Promise<{ ok: true; amount: number } | { ok: false; error: string }> {
  const info = await fetchTronTxInfo(opts.txId);
  if (!info) {
    return { ok: false, error: "No se encontró la transacción en TRON" };
  }
  if (info.receipt?.result && info.receipt.result !== "SUCCESS") {
    return { ok: false, error: "La transacción TRON falló" };
  }

  const expectedSun = usdtToSun(opts.amountUsdt);
  const transferTopic =
    "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

  const logs = info.log || [];
  for (const log of logs) {
    const topics = log.topics || [];
    const topic0 = (topics[0] || "").replace(/^0x/, "").toLowerCase();
    if (topic0 !== transferTopic) continue;

    // Must be the real USDT TRC-20 contract (not a fake token with same Transfer ABI)
    const logContract = hexAddressToBase58(log.address || "");
    if (
      !logContract ||
      logContract.toLowerCase() !== TRON_USDT_CONTRACT.toLowerCase()
    ) {
      continue;
    }

    const toTopic = topics[2] || "";
    const toHex = toTopic.replace(/^0x/, "").slice(-40);
    const toAddr = hexAddressToBase58(toHex);
    if (!toAddr) continue;

    if (toAddr.toLowerCase() !== opts.treasuryAddress.toLowerCase()) {
      continue;
    }

    if (opts.fromAddress && topics[1]) {
      const fromHex = topics[1].replace(/^0x/, "").slice(-40);
      const fromAddr = hexAddressToBase58(fromHex);
      if (
        fromAddr &&
        fromAddr.toLowerCase() !== opts.fromAddress.toLowerCase()
      ) {
        continue;
      }
    }

    const data = (log.data || "").replace(/^0x/, "");
    const amountSun = data ? parseInt(data, 16) : NaN;
    if (!Number.isFinite(amountSun)) continue;

    if (Math.abs(amountSun - expectedSun) <= 1) {
      return { ok: true, amount: sunToUsdt(amountSun) };
    }

    return {
      ok: false,
      error: `Monto incorrecto: se enviaron ${sunToUsdt(amountSun)} USDT, se esperaban ${opts.amountUsdt}`,
    };
  }

  // Fallback: in demo mode accept any successful tx id format
  if (tronEscrowDemoMode() && /^[a-fA-F0-9]{64}$/.test(opts.txId)) {
    return { ok: true, amount: opts.amountUsdt };
  }

  return {
    ok: false,
    error:
      "No se encontró un transfer USDT-TRC20 hacia la treasury SoloBBs en esa tx",
  };
}

export type UsdtIncomingTransfer = {
  txId: string;
  from: string;
  to: string;
  amountUsdt: number;
  amountSun: number;
  blockTimestamp: number;
};

/** Recent TRC20 USDT transfers received by an address (TronGrid). */
export async function fetchRecentUsdtIncoming(
  treasuryAddress: string,
  limit = 40,
): Promise<UsdtIncomingTransfer[]> {
  const url = new URL(
    `${TRON_FULL_HOST.replace(/\/$/, "")}/v1/accounts/${treasuryAddress}/transactions/trc20`,
  );
  url.searchParams.set("only_to", "true");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("contract_address", TRON_USDT_CONTRACT);

  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKey = process.env.TRONGRID_API_KEY || process.env.TRON_API_KEY;
  if (apiKey) headers["TRON-PRO-API-KEY"] = apiKey;

  try {
    const res = await fetch(url.toString(), {
      headers,
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: Array<{
        transaction_id?: string;
        from?: string;
        to?: string;
        value?: string;
        block_timestamp?: number;
        type?: string;
      }>;
    };

    const out: UsdtIncomingTransfer[] = [];
    for (const row of json.data || []) {
      const txId = row.transaction_id || "";
      if (!/^[a-fA-F0-9]{64}$/.test(txId)) continue;
      const amountSun = Number(row.value || 0);
      if (!Number.isFinite(amountSun) || amountSun <= 0) continue;
      out.push({
        txId,
        from: row.from || "",
        to: row.to || treasuryAddress,
        amountUsdt: sunToUsdt(amountSun),
        amountSun,
        blockTimestamp: row.block_timestamp || 0,
      });
    }
    return out;
  } catch {
    return [];
  }
}

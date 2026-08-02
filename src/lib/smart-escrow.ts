/**
 * Escrow settlement layer — TRON / TronLink.
 * Lock = USDT-TRC20 to treasury.
 * Release = automatic split: platform fee + referral L1–L3 + net to model.
 */
import { mockTxHash } from "./crypto-format";
import { tronEscrowDemoMode } from "./tron-escrow";
import { sendUsdtToAddress } from "./tron-send";
import type { ReferralSplit } from "./referrals";

export type EscrowLockInput = {
  escrowId: string;
  amountUsdt: number;
  modelId: string;
  clientId: string;
  contractAddress: string;
  chain: string;
  lockTxHash?: string;
};

export type EscrowReleaseInput = {
  escrowId: string;
  amountUsdt: number;
  feeUsdt: number;
  netUsdt: number;
  modelPayoutAddress?: string | null;
  treasuryAddress: string;
  contractAddress: string;
  chain: string;
  releaseTxHash?: string;
  /** Automatic referral discounts paid on release */
  referralSplits?: ReferralSplit[];
};

export async function smartEscrowLock(input: EscrowLockInput) {
  const contractEscrowId = `tron-${input.escrowId.slice(-10)}`;
  const lockTxHash = input.lockTxHash || mockTxHash();
  return {
    ok: true as const,
    automated: true,
    contractEscrowId,
    lockTxHash,
    chain: input.chain || "TRON",
    contractAddress: input.contractAddress,
    message: `Locked ${input.amountUsdt} USDT-TRC20 via TronLink`,
  };
}

/**
 * Settles release as an automatic multi-pay split (fee + referrals + model).
 * Ledger is always applied by releaseEscrow.
 * On-chain USDT sends run only when TRON_AUTO_SPLIT_ONCHAIN=true and hot wallet is configured.
 */
export async function smartEscrowRelease(input: EscrowReleaseInput) {
  const referralSplits = input.referralSplits || [];
  const referralTotal = referralSplits.reduce((a, s) => a + s.amount, 0);
  const payouts: Array<{ to: string; amount: number; role: string }> = [];

  if (input.feeUsdt > 0 && input.treasuryAddress) {
    payouts.push({
      to: input.treasuryAddress,
      amount: input.feeUsdt,
      role: "platform_fee",
    });
  }

  for (const split of referralSplits) {
    if (split.amount > 0 && split.tronAddress) {
      payouts.push({
        to: split.tronAddress,
        amount: split.amount,
        role: `referral_l${split.level}`,
      });
    }
  }

  if (input.netUsdt > 0 && input.modelPayoutAddress) {
    payouts.push({
      to: input.modelPayoutAddress,
      amount: input.netUsdt,
      role: "model_net",
    });
  }

  const txHashes: string[] = [];
  if (input.releaseTxHash) txHashes.push(input.releaseTxHash);

  const wantOnChain =
    process.env.TRON_AUTO_SPLIT_ONCHAIN === "true" && !tronEscrowDemoMode();

  let onChainOk = false;
  if (wantOnChain && payouts.length > 0) {
    onChainOk = true;
    for (const p of payouts) {
      const sent = await sendUsdtToAddress({
        toAddress: p.to,
        amountUsdt: p.amount,
      });
      if (!sent.ok || sent.demo) {
        onChainOk = false;
        break;
      }
      txHashes.push(sent.txId);
    }
  }

  const releaseTxHash =
    txHashes[0] || mockTxHash(onChainOk ? "" : "tron");

  return {
    ok: true as const,
    automated: true,
    onChain: onChainOk,
    demo: !onChainOk,
    releaseTxHash,
    txHashes,
    payoutAddress: input.modelPayoutAddress || "internal-ledger",
    feeToTreasury: input.feeUsdt,
    netToModel: input.netUsdt,
    referralTotal,
    referralSplits,
    payouts,
    chain: input.chain || "TRON",
    contractAddress: input.contractAddress,
    message: onChainOk
      ? `Split on-chain automático: modelo ${input.netUsdt} · fee ${input.feeUsdt} · referidos ${referralTotal} USDT`
      : `Split automático (ledger): modelo ${input.netUsdt} · fee ${input.feeUsdt} · referidos ${referralTotal} USDT`,
  };
}

export async function smartEscrowRefund(input: {
  escrowId: string;
  amountUsdt: number;
  contractAddress: string;
  chain: string;
}) {
  const releaseTxHash = mockTxHash("tron");
  return {
    ok: true as const,
    automated: true,
    releaseTxHash,
    chain: input.chain || "TRON",
    contractAddress: input.contractAddress,
    message: `Refunded ${input.amountUsdt} USDT on TRON`,
  };
}

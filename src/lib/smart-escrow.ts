/**
 * Capa de escrow on-chain.
 * Hoy: automatización simulada (lista para enganchar un contrato real en Polygon/TRON).
 * BTC/LTC no ejecutan Solidity: se usan como depósito → conversión a USDT de settlement.
 *
 * Contrato real esperado (EVM):
 * - lock(escrowId, amount, model, client)
 * - release(escrowId) → model recibe net, treasury recibe fee
 * - refund(escrowId) → client
 */
import { mockTxHash } from "./crypto-format";

export type EscrowLockInput = {
  escrowId: string;
  amountUsdt: number;
  modelId: string;
  clientId: string;
  contractAddress: string;
  chain: string;
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
};

export async function smartEscrowLock(input: EscrowLockInput) {
  // TODO: ethers/viem → escrowContract.lock(...)
  const contractEscrowId = `sc-${input.escrowId.slice(-8)}`;
  const lockTxHash = mockTxHash();
  return {
    ok: true as const,
    automated: true,
    contractEscrowId,
    lockTxHash,
    chain: input.chain,
    contractAddress: input.contractAddress,
    message: `Locked ${input.amountUsdt} USDT in escrow contract`,
  };
}

export async function smartEscrowRelease(input: EscrowReleaseInput) {
  // TODO: ethers/viem → escrowContract.release(escrowId)
  // Fee split on-chain: net → model, fee → treasury
  const releaseTxHash = mockTxHash();
  return {
    ok: true as const,
    automated: true,
    releaseTxHash,
    payoutAddress: input.modelPayoutAddress || "internal-ledger",
    feeToTreasury: input.feeUsdt,
    netToModel: input.netUsdt,
    chain: input.chain,
    contractAddress: input.contractAddress,
    message: `Released ${input.netUsdt} USDT to model, ${input.feeUsdt} USDT fee to treasury`,
  };
}

export async function smartEscrowRefund(input: {
  escrowId: string;
  amountUsdt: number;
  contractAddress: string;
  chain: string;
}) {
  const releaseTxHash = mockTxHash();
  return {
    ok: true as const,
    automated: true,
    releaseTxHash,
    chain: input.chain,
    contractAddress: input.contractAddress,
    message: `Refunded ${input.amountUsdt} USDT to client`,
  };
}

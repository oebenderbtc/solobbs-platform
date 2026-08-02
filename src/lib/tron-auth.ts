import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const TTL_MS = 5 * 60 * 1000;

function normalizeAddress(address: string) {
  return address.trim();
}

export function isTronAddress(address: string) {
  // Base58 Tron addresses start with T and are 34 chars
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address.trim());
}

export function buildTronAuthMessage(address: string, nonce: string) {
  const addr = normalizeAddress(address);
  return [
    "SoloBBs — autentica tu wallet TRON",
    "",
    `Dirección: ${addr}`,
    `Nonce: ${nonce}`,
    "",
    "Al firmar confirmas que controlas esta wallet.",
  ].join("\n");
}

export async function issueTronNonce(address: string) {
  const addr = normalizeAddress(address);
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.tronAuthNonce.upsert({
    where: { address: addr },
    create: { address: addr, nonce, expiresAt },
    update: { nonce, expiresAt },
  });

  return { nonce, message: buildTronAuthMessage(addr, nonce) };
}

export async function peekTronNonce(address: string, nonce: string) {
  const addr = normalizeAddress(address);
  const entry = await prisma.tronAuthNonce.findUnique({ where: { address: addr } });
  if (!entry) return false;
  if (entry.expiresAt.getTime() < Date.now()) {
    await prisma.tronAuthNonce.delete({ where: { address: addr } }).catch(() => {});
    return false;
  }
  return entry.nonce === nonce;
}

export async function consumeTronNonce(address: string, nonce: string) {
  const addr = normalizeAddress(address);
  if (!(await peekTronNonce(addr, nonce))) return false;
  await prisma.tronAuthNonce.delete({ where: { address: addr } }).catch(() => {});
  return true;
}

export function tronEmailFor(address: string) {
  return `tron.${normalizeAddress(address).toLowerCase()}@wallet.solobbs`;
}

export function shortTronName(address: string) {
  const a = normalizeAddress(address);
  return `TRON ${a.slice(0, 4)}…${a.slice(-4)}`;
}

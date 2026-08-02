import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptGasWalletPrivateKey } from "@/lib/platform-wallets";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

function publicSettings(
  settings: Awaited<ReturnType<typeof prisma.platformSettings.findUniqueOrThrow>>,
) {
  const { gasWalletKeyEnc, ...rest } = settings;
  return {
    ...rest,
    gasWalletKeyConfigured: Boolean(gasWalletKeyEnc?.trim()),
  };
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const settings = await prisma.platformSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  return NextResponse.json({ settings: publicSettings(settings) });
}

export async function PUT(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = z
    .object({
      platformFeePercent: z.number(),
      referralL1Percent: z.number(),
      referralL2Percent: z.number(),
      referralL3Percent: z.number(),
      minEscrowAmount: z.number(),
      cryptoWalletBtc: z.string(),
      cryptoWalletUsdt: z.string(),
      companyFeeWallet: z.string(),
      gasWalletAddress: z.string(),
      /** Paste new private key to update; empty keeps the existing one */
      gasWalletPrivateKey: z.string().optional(),
      platformNequi: z.string(),
      platformBankName: z.string(),
      platformBankAccount: z.string(),
      platformAccountName: z.string(),
    })
    .parse(await req.json());

  const {
    gasWalletPrivateKey,
    companyFeeWallet,
    gasWalletAddress,
    ...rest
  } = body;

  const fee = companyFeeWallet.trim();
  const gasAddr = gasWalletAddress.trim();
  if (fee && !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(fee)) {
    return NextResponse.json(
      { error: "Wallet de ganancias de la empresa inválida (debe ser TRON T…)" },
      { status: 400 },
    );
  }
  if (gasAddr && !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(gasAddr)) {
    return NextResponse.json(
      { error: "Wallet de gas inválida (debe ser TRON T…)" },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {
    ...rest,
    companyFeeWallet: fee,
    gasWalletAddress: gasAddr,
  };

  const rawKey = (gasWalletPrivateKey || "").trim().replace(/^0x/i, "");
  if (rawKey) {
    if (!/^[a-fA-F0-9]{64}$/.test(rawKey)) {
      return NextResponse.json(
        { error: "Clave privada de gas inválida (64 hex)" },
        { status: 400 },
      );
    }
    data.gasWalletKeyEnc = encryptGasWalletPrivateKey(rawKey);
  }

  const settings = await prisma.platformSettings.update({
    where: { id: "default" },
    data,
  });

  return NextResponse.json({ settings: publicSettings(settings) });
}

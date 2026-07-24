import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const settings = await prisma.platformSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  return NextResponse.json({ settings });
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
      platformNequi: z.string(),
      platformBankName: z.string(),
      platformBankAccount: z.string(),
      platformAccountName: z.string(),
    })
    .parse(await req.json());

  const settings = await prisma.platformSettings.update({
    where: { id: "default" },
    data: body,
  });

  return NextResponse.json({ settings });
}

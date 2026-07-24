import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const methodSchema = z.object({
  type: z.enum([
    "NEQUI",
    "BANCOLOMBIA",
    "DAVIVIENDA",
    "PSE",
    "CRYPTO_USDT",
    "OTHER",
  ]),
  label: z.string().min(2).max(80),
  accountName: z.string().min(2).max(120),
  accountNumber: z.string().min(3).max(80),
  bankName: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(200).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const methods = await prisma.userPaymentMethod.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ methods });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = methodSchema.parse(await req.json());

    if (body.isDefault) {
      await prisma.userPaymentMethod.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    const method = await prisma.userPaymentMethod.create({
      data: {
        ...body,
        bankName: body.bankName || null,
        phone: body.phone || null,
        notes: body.notes || null,
        isDefault: body.isDefault ?? false,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ method });
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = z
    .object({
      id: z.string(),
      action: z.enum(["setDefault", "deactivate"]).optional(),
      ...methodSchema.shape,
    })
    .partial()
    .extend({ id: z.string() })
    .parse(await req.json());

  const existing = await prisma.userPaymentMethod.findFirst({
    where: { id: body.id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (body.action === "deactivate") {
    const method = await prisma.userPaymentMethod.update({
      where: { id: body.id },
      data: { isActive: false, isDefault: false },
    });
    return NextResponse.json({ method });
  }

  if (body.action === "setDefault" || body.isDefault) {
    await prisma.userPaymentMethod.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    });
  }

  const method = await prisma.userPaymentMethod.update({
    where: { id: body.id },
    data: {
      ...(body.type ? { type: body.type } : {}),
      ...(body.label ? { label: body.label } : {}),
      ...(body.accountName ? { accountName: body.accountName } : {}),
      ...(body.accountNumber ? { accountNumber: body.accountNumber } : {}),
      ...(body.bankName !== undefined ? { bankName: body.bankName || null } : {}),
      ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
      ...(body.action === "setDefault" || body.isDefault
        ? { isDefault: true }
        : {}),
    },
  });

  return NextResponse.json({ method });
}

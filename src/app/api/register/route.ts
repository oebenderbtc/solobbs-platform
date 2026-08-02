import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateReferralCode } from "@/lib/utils";
import { generateCustodialTronWallet } from "@/lib/tron-wallet";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  city: z.string().optional(),
  phone: z.string().optional(),
  referralCode: z.string().optional(),
  role: z.enum(["MODEL", "CLIENT"]).default("MODEL"),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase();

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 400 });
    }

    let referredById: string | undefined;
    if (body.referralCode?.trim()) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: body.referralCode.trim().toUpperCase() },
      });
      if (referrer) referredById = referrer.id;
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    let referralCode = generateReferralCode(body.name);
    while (await prisma.user.findUnique({ where: { referralCode } })) {
      referralCode = generateReferralCode(body.name);
    }

    const wallet = await generateCustodialTronWallet();

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        passwordHash,
        city: body.city,
        phone: body.phone,
        role: body.role,
        referralCode,
        referredById,
        tronAddress: wallet.address,
        tronPrivateKeyEnc: wallet.privateKeyEnc,
        usdtPayoutAddress: wallet.address,
      },
      select: {
        id: true,
        email: true,
        name: true,
        referralCode: true,
        tronAddress: true,
      },
    });

    if (referredById) {
      await prisma.notification.create({
        data: {
          userId: referredById,
          title: "Nueva chica en tu red",
          body: `${user.name} se unió con tu código ${body.referralCode?.toUpperCase()}.`,
        },
      });
    }

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    console.error("register", error);
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }
}

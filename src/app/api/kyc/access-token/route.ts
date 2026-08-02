import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createSumsubAccessToken,
  isSumsubConfigured,
  sumsubLevelForRole,
} from "@/lib/sumsub";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSumsubConfigured()) {
    return NextResponse.json(
      {
        error:
          "Sumsub no está configurado. Agrega SUMSUB_APP_TOKEN y SUMSUB_SECRET_KEY en .env",
        code: "SUMSUB_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      kycStatus: true,
    },
  });

  if (user.role === "ADMIN") {
    return NextResponse.json(
      { error: "Los administradores no requieren KYC" },
      { status: 400 },
    );
  }

  const levelName = sumsubLevelForRole(user.role);

  try {
    const tokenRes = await createSumsubAccessToken({
      userId: user.id,
      levelName,
      email: user.email,
      phone: user.phone,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        kycLevel: levelName,
        kycStatus:
          user.kycStatus === "APPROVED" || user.kycStatus === "REJECTED"
            ? user.kycStatus
            : "PENDING",
      },
    });

    return NextResponse.json({
      token: tokenRes.token,
      userId: tokenRes.userId,
      levelName,
      kycStatus: user.kycStatus,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "No se pudo crear el token KYC",
      },
      { status: 502 },
    );
  }
}

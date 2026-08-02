import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isKycEnforced } from "@/lib/sumsub";

export async function getUserKyc(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      kycStatus: true,
      kycApplicantId: true,
      kycLevel: true,
      kycReviewedAt: true,
      isVerified: true,
    },
  });
}

export function isKycApproved(status: string | null | undefined) {
  return status === "APPROVED";
}

/**
 * Blocks paid actions until KYC is APPROVED.
 * Returns a NextResponse error if blocked; otherwise null.
 */
export async function requireKycApproved(userId: string, opts?: { role?: string }) {
  if (!isKycEnforced()) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycStatus: true, role: true, isVerified: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Admins never blocked by KYC gates
  if (user.role === "ADMIN" || opts?.role === "ADMIN") return null;

  if (isKycApproved(user.kycStatus) || user.isVerified) return null;

  return NextResponse.json(
    {
      error:
        "Debes verificar tu identidad (KYC / mayoría de edad) antes de continuar.",
      code: "KYC_REQUIRED",
      kycStatus: user.kycStatus,
      verifyUrl: "/dashboard/kyc",
    },
    { status: 403 },
  );
}

import "server-only";
import { TronWeb } from "tronweb";
import {
  consumeTronNonce,
  peekTronNonce,
  isTronAddress,
  tronEmailFor,
  shortTronName,
} from "@/lib/tron-auth";
import { prisma } from "@/lib/prisma";
import { generateReferralCode } from "@/lib/utils";

const tronWeb = new TronWeb({
  fullHost: process.env.TRON_FULL_HOST || "https://api.trongrid.io",
});

export async function verifyTronSignature(
  message: string,
  signature: string,
  expectedAddress: string,
) {
  try {
    const recovered = await tronWeb.trx.verifyMessageV2(message, signature);
    return (
      typeof recovered === "string" &&
      recovered.toLowerCase() === expectedAddress.toLowerCase()
    );
  } catch {
    return false;
  }
}

export async function authenticateTronWallet(input: {
  address: string;
  signature: string;
  nonce: string;
  message: string;
  name?: string;
  role?: "MODEL" | "CLIENT";
  referralCode?: string;
  mode?: "login" | "register";
}) {
  const address = input.address.trim();
  if (!isTronAddress(address)) {
    return { error: "Dirección TRON inválida", status: 400 as const };
  }
  if (!(await peekTronNonce(address, input.nonce))) {
    return { error: "Nonce inválido o expirado. Intenta de nuevo.", status: 400 as const };
  }

  const ok = await verifyTronSignature(input.message, input.signature, address);
  if (!ok) {
    return { error: "Firma inválida", status: 401 as const };
  }

  // Only burn nonce after a valid signature
  await consumeTronNonce(address, input.nonce);

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ tronAddress: address }, { email: tronEmailFor(address) }],
    },
  });

  if (!user) {
    let referredById: string | undefined;
    if (input.referralCode?.trim()) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: input.referralCode.trim().toUpperCase() },
      });
      // Referral is optional — ignore unknown codes instead of blocking signup
      if (referrer) referredById = referrer.id;
    }

    const rawName = (input.name || "").trim();
    const name =
      !rawName || rawName === "undefined" || rawName === "null"
        ? shortTronName(address)
        : rawName;
    let referralCode = generateReferralCode(name);
    while (await prisma.user.findUnique({ where: { referralCode } })) {
      referralCode = generateReferralCode(name);
    }

    const role =
      input.role === "MODEL" || input.role === "CLIENT"
        ? input.role
        : input.mode === "register"
          ? "MODEL"
          : "CLIENT";

    user = await prisma.user.create({
      data: {
        name,
        email: tronEmailFor(address),
        tronAddress: address,
        passwordHash: null,
        role,
        referralCode,
        referredById,
        usdtPayoutAddress: address,
      },
    });

    if (referredById) {
      await prisma.notification.create({
        data: {
          userId: referredById,
          title: "Nueva cuenta en tu red",
          body: `${user.name} se unió con TronLink usando tu código.`,
        },
      });
    }
  } else {
    if (!user.isActive) {
      return { error: "Cuenta desactivada", status: 403 as const };
    }
    // Wallet is permanent after signup — never replace tronAddress
    if (user.tronAddress && user.tronAddress.toLowerCase() !== address.toLowerCase()) {
      return {
        error:
          "Esta cuenta ya tiene una wallet TRON fija. Entra con esa misma wallet o con email/contraseña.",
        status: 403 as const,
      };
    }
    if (!user.tronAddress) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          tronAddress: address,
          usdtPayoutAddress: address,
        },
      });
    } else if (user.usdtPayoutAddress !== user.tronAddress) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { usdtPayoutAddress: user.tronAddress },
      });
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      referralCode: user.referralCode,
    },
  };
}

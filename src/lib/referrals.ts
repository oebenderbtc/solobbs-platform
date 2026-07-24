import { prisma } from "./prisma";
import { REFERRAL_PERCENTS } from "./utils";

/** Distribuye comisiones de red (hasta 3 niveles) cuando una modelo cobra un trabajo. */
export async function distributeReferralCommissions(
  sourceUserId: string,
  baseAmount: number,
) {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });

  const percents = [
    settings?.referralL1Percent ?? REFERRAL_PERCENTS[0],
    settings?.referralL2Percent ?? REFERRAL_PERCENTS[1],
    settings?.referralL3Percent ?? REFERRAL_PERCENTS[2],
  ];

  let current = await prisma.user.findUnique({
    where: { id: sourceUserId },
    select: { referredById: true, name: true },
  });

  for (let level = 0; level < 3; level++) {
    if (!current?.referredById) break;

    const earnerId = current.referredById;
    const percent = percents[level];
    const amount = Math.round((baseAmount * percent) / 100);

    if (amount > 0) {
      await prisma.$transaction([
        prisma.commission.create({
          data: {
            amount,
            level: level + 1,
            percent,
            description: `Nivel ${level + 1} · referido de ${current.name}`,
            earnerId,
            sourceId: sourceUserId,
          },
        }),
        prisma.user.update({
          where: { id: earnerId },
          data: {
            walletBalance: { increment: amount },
            totalEarned: { increment: amount },
          },
        }),
        prisma.notification.create({
          data: {
            userId: earnerId,
            title: `Comisión nivel ${level + 1}`,
            body: `Recibiste ${amount.toLocaleString("es-CO")} COP por tu red.`,
          },
        }),
      ]);
    }

    current = await prisma.user.findUnique({
      where: { id: earnerId },
      select: { referredById: true, name: true },
    });
  }
}

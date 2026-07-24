import { prisma } from "./prisma";

export async function recalculateUserRating(userId: string) {
  const agg = await prisma.review.aggregate({
    where: { targetId: userId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const rating =
    agg._count.rating > 0 ? Math.round((agg._avg.rating || 5) * 10) / 10 : 5;

  await prisma.user.update({
    where: { id: userId },
    data: { rating },
  });

  return rating;
}

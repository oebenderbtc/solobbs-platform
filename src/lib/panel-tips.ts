export type TipMeta = {
  id: string;
  path: string;
};

const modelTipIds: Record<string, string> = {
  "/dashboard": "model-home",
  "/dashboard/jobs": "model-jobs",
  "/dashboard/escrow": "model-escrow",
  "/dashboard/wallet": "model-wallet",
  "/dashboard/network": "model-network",
  "/dashboard/settings": "model-settings",
  "/dashboard/reviews": "model-reviews",
};

const adminTipIds: Record<string, string> = {
  "/admin": "admin-home",
  "/admin/users": "admin-users",
  "/admin/escrows": "admin-escrows",
  "/admin/payments": "admin-payments",
  "/admin/settings": "admin-settings",
  "/admin/support": "admin-support",
};

export function getTipIdForPath(pathname: string, role: string): string | null {
  const map = role === "ADMIN" ? adminTipIds : modelTipIds;
  if (map[pathname]) return map[pathname];

  const match = Object.keys(map)
    .filter((key) => pathname.startsWith(key) && key !== "/dashboard" && key !== "/admin")
    .sort((a, b) => b.length - a.length)[0];

  return match ? map[match] : null;
}

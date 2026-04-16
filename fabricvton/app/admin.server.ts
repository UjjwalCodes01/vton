// Super Admin authorization helper.
// A shop is a super admin if its domain is in the SUPER_ADMIN_SHOPS env var.

const SUPER_ADMIN_SHOPS = (process.env.SUPER_ADMIN_SHOPS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Check if a given shop domain has super admin access.
 */
export function isSuperAdmin(shop: string): boolean {
  return SUPER_ADMIN_SHOPS.includes(shop.toLowerCase());
}

/**
 * Throw a 403 if the shop is not a super admin.
 * Use in route loaders/actions.
 */
export function requireSuperAdmin(shop: string): void {
  if (!isSuperAdmin(shop)) {
    throw new Response("Forbidden — Super Admin access required.", {
      status: 403,
    });
  }
}

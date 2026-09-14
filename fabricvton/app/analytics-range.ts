/** Date ranges the Analytics page offers. */
export const ANALYTICS_RANGES = [7, 14, 30] as const;

/**
 * Parses the `days` query param, falling back to 30.
 *
 * Only the offered ranges are accepted: a raw parseInt turns `?days=abc` into
 * NaN, which becomes an Invalid Date that Prisma rejects with a 500.
 */
export function parseDays(value: string | null): number {
  const days = Number(value);
  return (ANALYTICS_RANGES as readonly number[]).includes(days) ? days : 30;
}

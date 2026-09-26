// One-tap rating of a finished try-on, from the widget's "How realistic is
// this AI try-on?" prompt.
//
// The rating is attached to the try-on it describes and to nothing else: no
// free text, no new identifier, and nothing that could turn an anonymous event
// into a personal one.

import db from "./db.server";

export type TryOnRating = "up" | "down";

export function parseRating(value: unknown): TryOnRating | null {
  return value === "up" || value === "down" ? value : null;
}

/**
 * Records what a shopper thought of one try-on.
 *
 * Scoped by shop as well as generation id, so a caller who learns another
 * store's id cannot write to its rows. `updateMany` rather than `update`
 * because a missing row is an ordinary outcome — the event may have aged out
 * of retention before the shopper got round to answering — and not an error
 * worth a 500.
 */
export async function recordTryOnRating(params: {
  shop: string;
  generationId: string;
  rating: TryOnRating;
}) {
  const { count } = await db.tryOnEvent.updateMany({
    where: {
      shop: params.shop,
      OR: [{ id: params.generationId }, { providerTaskId: params.generationId }],
    },
    data: { rating: params.rating, ratedAt: new Date() },
  });

  return { recorded: count > 0 };
}

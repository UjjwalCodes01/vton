import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { adminJson } from "../admin/api.server";
import { subjectFromSession } from "../invoices/subject.server";
import { signImageToken } from "../share/imageproxy.server";
import { readJsonLimited } from "../bodylimit.server";
import { playgroundShop } from "../invoices/playground.server";
import { deleteSharedLooks } from "../share/share.server";

const PAGE_SIZE = 20;
/** Result images can be fetched for this long after a try-on (as the API docs say). */
const IMAGE_LIFETIME_MS = 24 * 3600 * 1000;

/**
 * Try-ons across every store this account manages.
 *
 * Result images are addressed through our own signed proxy, never by the URL
 * the generator returned — the same rule the storefront widget follows.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const body = (await readJsonLimited(request)) as { session?: string; page?: number; shop?: string; step?: string; id?: string };
  const subject = await subjectFromSession(body.session);
  if (!subject) return adminJson({ error: "Session expired." }, 401);

  const shops = [...subject.stores.map((store) => store.shop), playgroundShop(subject.account.id)];

  // Deleting one try-on: only from a store (or Playground) this account manages,
  // and only once it has finished, because a running try-on still holds a
  // reserved credit that settling it releases. Any shared-look copy goes with
  // it, and without the row the image link stops resolving.
  if (body.step === "delete") {
    const event = await db.tryOnEvent.findFirst({
      where: { id: String(body.id || ""), shop: { in: shops } },
      select: { id: true, shop: true, status: true, providerTaskId: true },
    });
    if (!event) return adminJson({ error: "That try-on was not found." }, 404);
    if (event.status === "pending") return adminJson({ error: "This try-on is still running. Delete it once it finishes." }, 409);
    await deleteSharedLooks({ shop: event.shop, generationIds: event.providerTaskId ? [event.id, event.providerTaskId] : [event.id] });
    await db.tryOnEvent.delete({ where: { id: event.id } });
    return adminJson({ deleted: true });
  }

  // A shop filter is only honoured for stores this account actually manages.
  const scope = body.shop && shops.includes(body.shop) ? [body.shop] : shops;
  const page = Math.max(1, Number(body.page) || 1);

  const [rows, total] = await Promise.all([
    db.tryOnEvent.findMany({
      where: { shop: { in: scope } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, shop: true, status: true, productTitle: true, createdAt: true,
        processingMs: true, rating: true, providerTaskId: true,
      },
    }),
    db.tryOnEvent.count({ where: { shop: { in: scope } } }),
  ]);

  return adminJson({
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    total,
    generations: rows.map((row) => ({
      id: row.id,
      shop: row.shop,
      status: row.status,
      productTitle: row.productTitle,
      createdAt: row.createdAt,
      seconds: row.processingMs ? Math.round(row.processingMs / 100) / 10 : null,
      rating: row.rating,
      imageUrl:
        row.status === "success" && row.providerTaskId && Date.now() - row.createdAt.getTime() < IMAGE_LIFETIME_MS
          ? `/i/${signImageToken(row.id)}`
          : null,
      imageExpired: row.status === "success" && Date.now() - row.createdAt.getTime() >= IMAGE_LIFETIME_MS,
    })),
  });
};

export const loader = () => new Response("Method not allowed", { status: 405 });

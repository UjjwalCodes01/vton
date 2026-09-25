import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { adminJson } from "../admin/api.server";
import { subjectFromSession } from "../invoices/subject.server";
import { signImageToken } from "../share/imageproxy.server";

const PAGE_SIZE = 20;

/**
 * Try-ons across every store this account manages.
 *
 * Result images are addressed through our own signed proxy, never by the URL
 * the generator returned — the same rule the storefront widget follows.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const body = (await request.json().catch(() => ({}))) as { session?: string; page?: number; shop?: string };
  const subject = await subjectFromSession(body.session);
  if (!subject) return adminJson({ error: "Session expired." }, 401);

  const shops = subject.stores.map((store) => store.shop);
  if (shops.length === 0) {
    return adminJson({ page: 1, pages: 1, total: 0, generations: [] });
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
        processingMs: true, errorCode: true, rating: true, providerTaskId: true,
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
      errorCode: row.errorCode,
      rating: row.rating,
      imageUrl:
        row.status === "success" && row.providerTaskId
          ? `/i/${signImageToken(row.shop, row.providerTaskId)}`
          : null,
    })),
  });
};

export const loader = () => new Response("Method not allowed", { status: 405 });

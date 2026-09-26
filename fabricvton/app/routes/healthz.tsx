// Liveness probe for uptime pingers that keep the Render instance from spinning
// down. Deliberately does NOT touch the database or any upstream service, so a
// ping costs almost nothing and can never be the thing that wakes Prisma or
// the engine. Unauthenticated by design — it reveals nothing.
export const loader = async () => {
  return new Response("ok", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  });
};

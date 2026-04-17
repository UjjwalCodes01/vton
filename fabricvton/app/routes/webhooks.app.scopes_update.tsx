import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { payload, session, topic, shop } = await authenticate.webhook(request);

    if (topic !== "APP_SCOPES_UPDATE") {
        throw new Response("Unhandled topic", { status: 422 });
    }

    console.log(`Received ${topic} webhook for ${shop}`);

    const currentScopes = Array.isArray((payload as { current?: unknown[] }).current)
        ? ((payload as { current: string[] }).current ?? [])
        : [];

    if (session?.id) {
        await db.session.updateMany({
            where: { id: session.id },
            data: { scope: currentScopes.join(",") },
        });
    }

    return new Response("ok", { status: 200 });
};

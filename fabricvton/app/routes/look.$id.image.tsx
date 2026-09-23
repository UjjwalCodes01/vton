import type { LoaderFunctionArgs } from "react-router";
import { getSharedLook } from "../share/share.server";
import { getObject } from "../share/storage.server";
import { logInternalError, newRequestId } from "../requestid.server";

// GET /look/<id>/image — the stored image behind a shared link.
//
// Served through the backend rather than from a public bucket URL so that the
// image disappears the moment the look expires, whatever the bucket's own
// lifecycle rules happen to be doing.

const NOT_FOUND = new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const requestId = newRequestId();
  try {
    const look = await getSharedLook(params.id || "");
    if (!look) return NOT_FOUND;

    const object = await getObject(look.imageKey);
    if (!object || !object.body) return NOT_FOUND;

    return new Response(object.body, {
      status: 200,
      headers: {
        "Content-Type": look.contentType,
        // Public, because a chat app's unfurl service fetches this without the
        // viewer's session — but only for as long as the link itself lives.
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logInternalError(requestId, "look image", error);
    return NOT_FOUND;
  }
};

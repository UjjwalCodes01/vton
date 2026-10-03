import type { LoaderFunctionArgs } from "react-router";
import { getSharedLook } from "../share/share.server";
import { getObject } from "../share/storage.server";
import { logInternalError, newRequestId } from "../requestid.server";
import { screenResultImage } from "../safety.server";

// GET /look/<id>/image — the stored image behind a shared link.
//
// Served through the backend rather than from a public bucket URL so that the
// image disappears the moment the look expires, whatever the bucket's own
// lifecycle rules happen to be doing.

// A fresh Response each time: a body can only be read once.
const NOT_FOUND = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const requestId = newRequestId();
  try {
    const look = await getSharedLook(params.id || "");
    if (!look) return NOT_FOUND();

    const object = await getObject(look.imageKey);
    if (!object || !object.body) return NOT_FOUND();

    const raw = new Uint8Array(await object.arrayBuffer());
    await screenResultImage(raw);
    return new Response(new Blob([raw]), {
      status: 200,
      headers: {
        "Content-Type": look.contentType,
        // A chat app may fetch this without a session; screen each retrieval.
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logInternalError(requestId, "look image", error);
    return NOT_FOUND();
  }
};

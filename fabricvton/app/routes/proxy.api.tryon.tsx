import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { handleTryOnAction, handleTryOnLoader } from "../tryon.server";

function proxyJsonError(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown app proxy error";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.public.appProxy(request);
    return await handleTryOnLoader(request);
  } catch (error) {
    if (error instanceof Response) {
      return proxyJsonError(error.statusText || "App proxy request failed", error.status);
    }
    return proxyJsonError(getErrorMessage(error), 500);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    await authenticate.public.appProxy(request);
    return await handleTryOnAction(request);
  } catch (error) {
    if (error instanceof Response) {
      return proxyJsonError(error.statusText || "App proxy request failed", error.status);
    }
    return proxyJsonError(getErrorMessage(error), 500);
  }
};

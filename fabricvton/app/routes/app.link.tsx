import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData } from "react-router";
import { authenticate } from "../shopify.server";
import { finishStoreLink, StoreLinkError } from "../invoices/store-link.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  try {
    await finishStoreLink(String(form.get("code") || ""), "shopify", `https://${session.shop}`, session.shop);
    return { ok: true, message: "Store linked to your Clothsy platform account." };
  } catch (error) {
    if (error instanceof StoreLinkError) return { ok: false, message: error.message };
    console.error("[store link]", error);
    return { ok: false, message: "Could not link store. Try again in a minute." };
  }
};

export default function LinkStore() {
  const result = useActionData<typeof action>();
  return <s-page heading="Connect this store to your platform account">
    <s-section>
      <p>Start in your Clothsy platform account, enter this store&apos;s .myshopify.com address, then paste the one-time code here. Your Shopify admin login proves you manage this store.</p>
      <Form method="post">
        <label htmlFor="connection-code">One-time connection code</label>{" "}
        <input id="connection-code" name="code" required maxLength={24} autoComplete="off" />{" "}
        <button type="submit">Connect store</button>
      </Form>
      {result ? <p role="status">{result.message}</p> : null}
    </s-section>
  </s-page>;
}

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { actorFrom, adminError, adminJson, AdminApiError, requireAdminToken } from "../admin/api.server";
import { readJsonLimited } from "../bodylimit.server";
import { adjustKeyCredits, createAdminKey, createStandaloneKey, listKeys, MAX_KEY_CREDITS, renameKey, revokeKey } from "../invoices/api-keys.server";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/**
 * Admin API for issued API keys: create one with its own try-on allowance,
 * change the allowance, or revoke a key. Every change is written to the audit
 * log. The plaintext key appears only in the create response.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    requireAdminToken(request);
    const body = (await readJsonLimited(request)) as Record<string, unknown>;
    const actor = actorFrom(request, body);
    const audit = (action: string, details: Record<string, unknown>) =>
      db.adminAuditLog.create({ data: { adminShop: actor, action, details: JSON.stringify(details) } });

    if (body.action === "create_key") {
      const email = String(body.email || "").trim().toLowerCase();
      const credits = Number(body.credits);
      if (!EMAIL.test(email)) throw new AdminApiError(400, "Enter a valid email address.");
      if (!Number.isSafeInteger(credits) || credits < 1 || credits > MAX_KEY_CREDITS) {
        throw new AdminApiError(400, `Try-ons must be a whole number from 1 to ${MAX_KEY_CREDITS.toLocaleString("en-US")}.`);
      }
      const created = await createAdminKey({
        email,
        name: String(body.name || ""),
        credits,
        note: typeof body.note === "string" ? body.note : null,
      });
      await audit("api_key_create", { email, keyId: created.key.id, prefix: created.key.prefix, credits });
      return adminJson(created, 201);
    }

    if (body.action === "create_standalone") {
      const credits = Number(body.credits);
      if (!Number.isSafeInteger(credits) || credits < 1 || credits > MAX_KEY_CREDITS) {
        throw new AdminApiError(400, `Try-ons must be a whole number from 1 to ${MAX_KEY_CREDITS.toLocaleString("en-US")}.`);
      }
      const created = await createStandaloneKey({
        name: String(body.name || ""),
        credits,
        note: typeof body.note === "string" ? body.note : null,
      });
      await audit("api_key_create_standalone", { keyId: created.key.id, prefix: created.key.prefix, credits });
      return adminJson(created, 201);
    }

    if (body.action === "rename_key") {
      const keyId = String(body.keyId || "");
      const changed = await renameKey(keyId, {
        name: typeof body.name === "string" ? body.name : undefined,
        note: typeof body.note === "string" ? body.note : undefined,
      });
      if (changed === null) throw new AdminApiError(400, "Give the key a name or a note.");
      if (!changed) throw new AdminApiError(404, "No key with that id.");
      await audit("api_key_rename", { keyId, name: body.name, note: body.note });
      return adminJson({ renamed: true });
    }

    if (body.action === "add_credits") {
      const keyId = String(body.keyId || "");
      const amount = Number(body.amount);
      if (!keyId || !Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > MAX_KEY_CREDITS) {
        throw new AdminApiError(400, "Enter a non-zero whole number of try-ons to add or remove.");
      }
      const key = await adjustKeyCredits(keyId, amount);
      if (!key) throw new AdminApiError(404, "No active issued key with that id.");
      await audit("api_key_credits", { keyId, prefix: key.prefix, amount, credits: key.credits });
      return adminJson({ key });
    }

    if (body.action === "revoke_key") {
      const keyId = String(body.keyId || "");
      if (!(await revokeKey(keyId))) throw new AdminApiError(404, "No active key with that id.");
      await audit("api_key_revoke", { keyId });
      return adminJson({ revoked: true });
    }

    throw new AdminApiError(400, "Unknown action.");
  } catch (error) {
    return adminError(error);
  }
};

/** GET — every key, filterable by q, status (active|revoked) and type (self|admin|standalone). */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    requireAdminToken(request);
    const params = new URL(request.url).searchParams;
    return adminJson(
      await listKeys({
        q: params.get("q") || "",
        status: params.get("status") || "",
        type: params.get("type") || "",
        page: Number(params.get("page")) || 1,
      }),
    );
  } catch (error) {
    return adminError(error);
  }
};

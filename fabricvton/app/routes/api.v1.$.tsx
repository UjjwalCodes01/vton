import { apiError } from "../invoices/customer-api.server";

/**
 * Any /api/v1 address that isn't an endpoint.
 *
 * Without this, a typo in a path fell through to the app's HTML error page — a
 * developer-facing page, and not JSON — so API clients got an unparseable
 * response. Every API answer, including "no such endpoint", is `{ error, code }`.
 */
const notFound = () =>
  apiError(404, "NOT_FOUND", "No such endpoint. See https://clothsyai.fabricvton.com/docs/api for the list.");

export const loader = notFound;
export const action = notFound;

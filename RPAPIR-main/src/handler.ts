import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { randomUUID } from "node:crypto";
import { verifyClient } from "./clientAuth.js";
import {
  acquire,
  acquireById,
  getKeyRecord,
  markAuthFailed,
  markQuota,
  markTemporary,
  recordSuccess,
  releaseLease
} from "./keyPool.js";
import { callProvider } from "./provider.js";
import { cfg } from "./config.js";
import { upstream } from "./upstream.js";
import { getSessionKey, getTaskKey, saveSession, saveTask } from "./taskStore.js";

const json = (statusCode: number, body: unknown, requestId: string, extraHeaders: Record<string, string> = {}) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-request-id": requestId,
    ...extraHeaders
  },
  body: JSON.stringify(body)
});

const safeHeader = (headers: Record<string, string | undefined> | undefined, name: string): string | undefined => {
  if (!headers) return undefined;
  const direct = headers[name];
  if (direct) return direct;
  const lower = name.toLowerCase();
  return Object.entries(headers).find(([k]) => k.toLowerCase() === lower)?.[1];
};

const taskIdFrom = (body: unknown): string | null => {
  if (typeof body !== "object" || body === null || !("data" in body)) return null;
  const data = body.data;
  if (typeof data !== "object" || data === null || !("task_id" in data)) return null;
  const taskId = data.task_id;
  return typeof taskId === "string" && /^[A-Za-z0-9_-]{1,256}$/.test(taskId) ? taskId : null;
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const requestId = randomUUID();
  const clientId = safeHeader(event.headers, "x-client-id");
  const clientToken = safeHeader(event.headers, "x-client-token");

  if (!clientId || (cfg.requireClientToken && !clientToken)) {
    return json(401, { error: "unauthorized" }, requestId);
  }

  try {
    if (cfg.requireClientToken && !(await verifyClient(clientId, clientToken!))) {
      return json(401, { error: "unauthorized" }, requestId);
    }
  } catch (error) {
    console.error("client_auth_failed", {
      requestId,
      error: error instanceof Error ? error.name : "unknown"
    });
    return json(503, { error: "authentication_unavailable" }, requestId);
  }

  const method = event.requestContext.http.method;
  if (method === "GET") {
    const taskId = event.pathParameters?.taskId;
    if (!taskId || !/^[A-Za-z0-9_-]{1,256}$/.test(taskId)) {
      return json(400, { error: "invalid_task_id" }, requestId);
    }
    try {
      const providerKeyId = await getTaskKey(clientId, taskId);
      if (!providerKeyId) return json(404, { error: "task_not_found" }, requestId);
      const key = await getKeyRecord(providerKeyId);
      if (!key || key.status === "DISABLED" || key.status === "AUTH_FAILED") {
        return json(503, { error: "task_credential_unavailable" }, requestId);
      }
      const result = await callProvider(key, requestId, "GET", `${upstream.path}/${taskId}`);
      if (result.kind === "success") return json(result.status, result.body, requestId);
      if (result.status === 404) return json(404, { error: "upstream_task_not_found" }, requestId);
      return json(503, { error: "upstream_task_unavailable" }, requestId);
    } catch (error) {
      console.error("task_poll_failed", { requestId, error: error instanceof Error ? error.name : "unknown" });
      return json(503, { error: "task_poll_unavailable" }, requestId);
    }
  }

  const isFile = method === "POST" && event.rawPath === "/v1/file";
  const isTask = method === "POST" && event.rawPath === "/v1/request";
  if (!isFile && !isTask) {
    return json(404, { error: "not_found" }, requestId);
  }

  const rawBody = event.body
    ? (event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body)
    : "{}";

  if (Buffer.byteLength(rawBody, "utf8") > cfg.maxRequestBodyBytes) {
    return json(413, { error: "request_too_large" }, requestId);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, { error: "invalid_json" }, requestId);
  }

  const sessionId = safeHeader(event.headers, "x-key-session");
  if (sessionId && !/^[0-9a-f-]{36}$/.test(sessionId)) {
    return json(400, { error: "invalid_key_session" }, requestId);
  }
  if (isTask && !sessionId && typeof payload === "object" && payload !== null &&
    ("src_file_id" in payload || "ref_file_id" in payload)) {
    return json(400, { error: "key_session_required_for_file_ids" }, requestId);
  }

  let pinnedKeyId: string | null = null;
  if (sessionId) {
    try {
      pinnedKeyId = await getSessionKey(clientId, sessionId);
    } catch (error) {
      console.error("session_lookup_failed", { requestId, error: error instanceof Error ? error.name : "unknown" });
      return json(503, { error: "key_session_unavailable" }, requestId);
    }
    if (!pinnedKeyId) return json(404, { error: "key_session_not_found" }, requestId);
  }

  const attempted = new Set<string>();

  for (let attempt = 0; attempt < (pinnedKeyId ? 1 : cfg.maxAttempts); attempt++) {
    const key = pinnedKeyId ? await acquireById(pinnedKeyId) : await acquire(cfg.providerName, attempted);
    if (!key) return pinnedKeyId
      ? json(409, { error: "workflow_key_unavailable_restart_upload" }, requestId)
      : json(503, { error: "no_healthy_provider_credentials" }, requestId);

    attempted.add(key.keyId);

    try {
      const result = await callProvider(key, requestId, "POST", isFile ? "/s2s/v2.0/file" : upstream.path, payload);

      if (result.kind === "success") {
        if (isFile) {
          let issuedSession = sessionId;
          if (!issuedSession) {
            try {
              issuedSession = await saveSession(clientId, key.keyId);
            } catch (error) {
              console.error("session_tracking_failed", { requestId, error: error instanceof Error ? error.name : "unknown" });
              await releaseLease(key);
              return json(503, { error: "session_tracking_unavailable" }, requestId);
            }
          }
          await recordSuccess(key);
          return json(result.status, result.body, requestId, { "x-key-session": issuedSession });
        }
        const taskId = taskIdFrom(result.body);
        if (!taskId) {
          await releaseLease(key);
          return json(502, { error: "upstream_task_id_missing" }, requestId);
        }
        try {
          await saveTask(clientId, taskId, key.keyId);
        } catch (error) {
          console.error("task_tracking_failed", { requestId, error: error instanceof Error ? error.name : "unknown" });
          await releaseLease(key);
          return json(503, { error: "task_tracking_unavailable" }, requestId);
        }
        await recordSuccess(key);
        return json(result.status, result.body, requestId);
      }

      if (result.kind === "quota") {
        await markQuota(key);
        if (pinnedKeyId) return json(409, { error: "workflow_key_exhausted_restart_upload" }, requestId);
        continue;
      }

      if (result.kind === "auth") {
        if (cfg.permanentDisableAfterAuth) await markAuthFailed(key);
        else await markTemporary(key);
        if (pinnedKeyId) return json(409, { error: "workflow_key_unavailable_restart_upload" }, requestId);
        continue;
      }

      if (result.kind === "temporary") {
        await markTemporary(key);
        return json(503, { error: "upstream_temporarily_unavailable" }, requestId);
      }

      await releaseLease(key);
      return json(result.status >= 400 && result.status < 500 ? 400 : 502, { error: "upstream_request_rejected" }, requestId);
    } catch (error) {
      console.error("provider_call_failed", {
        requestId,
        keyId: key.keyId,
        error: error instanceof Error ? error.name : "unknown"
      });
      await markTemporary(key);
      return json(503, { error: "upstream_call_unavailable" }, requestId);
    }
  }

  return json(503, { error: "all_provider_attempts_failed" }, requestId);
};

import {
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import {
  GetCommand,
  QueryCommand,
  UpdateCommand,
  type UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID, randomInt } from "node:crypto";
import { ddb, secrets } from "./aws.js";
import { cfg } from "./config.js";
import type { KeyRecord, LeasedKey } from "./types.js";

type SecretPayload = { api_key: string; api_secret?: string } | { keys: Record<string, string> };
const secretCache = new Map<string, { value: SecretPayload; expiresAt: number }>();
const SECRET_CACHE_MS = 5 * 60 * 1000;

export async function getSecret(secretId: string, secretKeyId?: string): Promise<{ apiKey: string; apiSecret?: string }> {
  const cached = secretCache.get(secretId);
  let value: SecretPayload;
  if (cached && cached.expiresAt > Date.now()) {
    value = cached.value;
  } else {
    const out = await secrets.send(new GetSecretValueCommand({ SecretId: secretId }));
    if (!out.SecretString) throw new Error("Secret has no SecretString");
    try {
      value = JSON.parse(out.SecretString) as SecretPayload;
    } catch {
      throw new Error("Secret is not valid JSON");
    }
    if (typeof value !== "object" || value === null) throw new Error("Secret has invalid shape");
    secretCache.set(secretId, { value, expiresAt: Date.now() + SECRET_CACHE_MS });
  }

  if (secretKeyId) {
    if (!("keys" in value) || typeof value.keys !== "object" || value.keys === null) {
      throw new Error("Grouped secret has invalid shape");
    }
    const apiKey = value.keys[secretKeyId];
    if (typeof apiKey !== "string" || apiKey.length === 0) throw new Error("Grouped secret missing key");
    return { apiKey };
  }
  if (!("api_key" in value) || typeof value.api_key !== "string" || value.api_key.length === 0) {
    throw new Error("Secret missing api_key");
  }
  return { apiKey: value.api_key, apiSecret: value.api_secret };
}

export function invalidateSecret(secretId: string): void {
  secretCache.delete(secretId);
}

async function candidates(provider: string): Promise<KeyRecord[]> {
  const now = Math.floor(Date.now() / 1000);
  const results: KeyRecord[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  const target = cfg.candidateLimit * 4;

  // Paginate a few pages so a hot batch of leased keys does not hide healthy keys farther into the pool.
  for (let page = 0; page < 4 && results.length < target; page++) {
    const out = await ddb.send(new QueryCommand({
      TableName: cfg.keyTable,
      IndexName: "provider-eligible-index",
      KeyConditionExpression: "#provider = :provider AND #eligibleAt <= :now",
      ExpressionAttributeNames: { "#provider": "provider", "#eligibleAt": "eligibleAt" },
      ExpressionAttributeValues: { ":provider": provider, ":now": now },
      Limit: cfg.candidateLimit,
      ScanIndexForward: true,
      ExclusiveStartKey: exclusiveStartKey
    }));

    results.push(...((out.Items ?? []) as KeyRecord[]));
    if (!out.LastEvaluatedKey) break;
    exclusiveStartKey = out.LastEvaluatedKey as Record<string, unknown>;
  }

  return results;
}

async function claim(key: KeyRecord): Promise<LeasedKey | null> {
  const now = Math.floor(Date.now() / 1000);
  const leaseId = randomUUID();
  try {
    await ddb.send(new UpdateCommand({
      TableName: cfg.keyTable,
      Key: { keyId: key.keyId },
      UpdateExpression:
        "SET #status = :active, #eligibleAt = :now, leaseUntil = :leaseUntil, leaseId = :leaseId, lastUsedAt = :now, totalRequests = if_not_exists(totalRequests, :zeroCount) + :one REMOVE disabledUntil",
      ConditionExpression:
        "#eligibleAt <= :now AND (attribute_not_exists(leaseUntil) OR leaseUntil <= :now) AND (#status = :active OR #status = :temp)",
      ExpressionAttributeNames: {
        "#status": "status",
        "#eligibleAt": "eligibleAt"
      },
      ExpressionAttributeValues: {
        ":active": "ACTIVE",
        ":temp": "TEMP_DISABLED",
        ":leaseUntil": now + cfg.leaseSeconds,
        ":leaseId": leaseId,
        ":now": now,
        ":zeroCount": 0,
        ":one": 1
      }
    }));
    return { ...key, status: "ACTIVE", eligibleAt: now, leaseId, leaseUntil: now + cfg.leaseSeconds };
  } catch {
    return null;
  }
}

export async function acquire(provider: string, attempted: Set<string>): Promise<LeasedKey | null> {
  const list = await candidates(provider);
  // Use one cryptographically secure random starting point rather than biased Array.sort(Math.random()).
  if (list.length === 0) return null;
  const start = randomInt(list.length);
  for (let i = 0; i < list.length; i++) {
    const index = (start + i) % list.length;
    const key = list[index];
    if (!key || attempted.has(key.keyId)) continue;
    const leased = await claim(key);
    if (leased) return leased;
  }
  return null;
}

export async function getKeyRecord(keyId: string): Promise<KeyRecord | null> {
  const out = await ddb.send(new GetCommand({
    TableName: cfg.keyTable,
    Key: { keyId },
    ConsistentRead: true
  }));
  const item = out.Item as KeyRecord | undefined;
  return item?.secretId ? item : null;
}

export async function acquireById(keyId: string): Promise<LeasedKey | null> {
  // A file workflow is pinned to this key. Another short request may hold its
  // lease between file registration and task creation, so wait briefly rather
  // than failing the shopper's workflow on a harmless collision.
  for (let attempt = 0; attempt < 4; attempt++) {
    const key = await getKeyRecord(keyId);
    if (!key || !["ACTIVE", "TEMP_DISABLED"].includes(key.status)) return null;
    const leased = await claim(key);
    if (leased) return leased;
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
  }
  return null;
}

async function mark(key: LeasedKey, status: KeyRecord["status"], eligibleAt: number, reason: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const input: UpdateCommandInput = {
    TableName: cfg.keyTable,
    Key: { keyId: key.keyId },
    UpdateExpression:
      "SET #status = :status, #eligibleAt = :eligibleAt, lastFailureAt = :now, lastErrorClass = :reason, failureCount = if_not_exists(failureCount, :zero) + :one REMOVE leaseUntil, leaseId",
    ConditionExpression: "leaseId = :leaseId",
    ExpressionAttributeNames: {
      "#status": "status",
      "#eligibleAt": "eligibleAt"
    },
    ExpressionAttributeValues: {
      ":status": status,
      ":eligibleAt": eligibleAt,
      ":now": now,
      ":reason": reason,
      ":zero": 0,
      ":one": 1,
      ":leaseId": key.leaseId
    }
  };
  await ddb.send(new UpdateCommand(input));
}

export async function markQuota(key: LeasedKey): Promise<void> {
  try {
    await mark(key, "QUOTA_EXHAUSTED", cfg.permanentEligibleAt, "quota");
  } catch {
    // Another concurrent state transition already won; do not downgrade it.
  }
}

export async function markAuthFailed(key: LeasedKey): Promise<void> {
  try {
    await mark(key, "AUTH_FAILED", cfg.permanentEligibleAt, "auth");
  } catch {
    // Another concurrent state transition already won.
  }
}

export async function markTemporary(key: LeasedKey): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  try {
    await mark(key, "TEMP_DISABLED", now + cfg.tempDisableSeconds, "temporary");
  } catch {
    // Another concurrent state transition already won.
  }
}

export async function recordSuccess(key: LeasedKey): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  try {
    await ddb.send(new UpdateCommand({
      TableName: cfg.keyTable,
      Key: { keyId: key.keyId },
      UpdateExpression:
        "SET #status = :active, #eligibleAt = :now, successfulRequests = if_not_exists(successfulRequests, :zeroCount) + :one REMOVE leaseUntil, leaseId",
      ConditionExpression: "leaseId = :leaseId",
      ExpressionAttributeNames: { "#status": "status", "#eligibleAt": "eligibleAt" },
      ExpressionAttributeValues: {
        ":active": "ACTIVE",
        ":now": now,
        ":zeroCount": 0,
        ":one": 1,
        ":leaseId": key.leaseId
      }
    }));
  } catch {
    // If the lease was already replaced, never reactivate the newer state.
  }
}

export async function releaseLease(key: LeasedKey): Promise<void> {
  try {
    await ddb.send(new UpdateCommand({
      TableName: cfg.keyTable,
      Key: { keyId: key.keyId },
      UpdateExpression: "REMOVE leaseUntil, leaseId",
      ConditionExpression: "leaseId = :leaseId",
      ExpressionAttributeValues: { ":leaseId": key.leaseId }
    }));
  } catch {
    // Ignore races; lease expiry is the final recovery mechanism.
  }
}

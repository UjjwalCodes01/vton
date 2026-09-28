import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { createHash, timingSafeEqual } from "node:crypto";
import { ddb } from "./aws.js";
import { cfg } from "./config.js";

function hash(value: string): Uint8Array {
  return createHash("sha256").update(value, "utf8").digest();
}

export async function verifyClient(clientId: string, token: string): Promise<boolean> {
  if (!clientId || clientId.length > 128 || token.length > 512) return false;
  const out = await ddb.send(new GetCommand({
    TableName: cfg.clientTable,
    Key: { clientId },
    ConsistentRead: true
  }));
  if (out.Item?.revokedAt) return false;
  const stored = out.Item?.tokenHash;
  if (typeof stored !== "string" || !/^[0-9a-f]{64}$/i.test(stored)) return false;

  const a = hash(token);
  const b = Buffer.from(stored, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

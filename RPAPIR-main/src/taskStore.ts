import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { ddb } from "./aws.js";
import { cfg } from "./config.js";

const TASK_TTL_SECONDS = 24 * 60 * 60;
const taskKey = (clientId: string, taskId: string) => `TASK#${clientId}#${taskId}`;
const sessionKey = (clientId: string, sessionId: string) => `SESSION#${clientId}#${sessionId}`;

export async function saveTask(clientId: string, taskId: string, providerKeyId: string): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: cfg.keyTable,
    Item: {
      keyId: taskKey(clientId, taskId),
      providerKeyId,
      clientId,
      expiresAt: Math.floor(Date.now() / 1000) + TASK_TTL_SECONDS
    },
    ConditionExpression: "attribute_not_exists(keyId)"
  }));
}

export async function getTaskKey(clientId: string, taskId: string): Promise<string | null> {
  const out = await ddb.send(new GetCommand({
    TableName: cfg.keyTable,
    Key: { keyId: taskKey(clientId, taskId) },
    ConsistentRead: true
  }));
  if (!out.Item || out.Item.clientId !== clientId || out.Item.expiresAt <= Math.floor(Date.now() / 1000)) return null;
  return typeof out.Item.providerKeyId === "string" ? out.Item.providerKeyId : null;
}

export async function saveSession(clientId: string, providerKeyId: string): Promise<string> {
  const sessionId = randomUUID();
  await ddb.send(new PutCommand({
    TableName: cfg.keyTable,
    Item: {
      keyId: sessionKey(clientId, sessionId),
      providerKeyId,
      clientId,
      expiresAt: Math.floor(Date.now() / 1000) + TASK_TTL_SECONDS
    },
    ConditionExpression: "attribute_not_exists(keyId)"
  }));
  return sessionId;
}

export async function getSessionKey(clientId: string, sessionId: string): Promise<string | null> {
  const out = await ddb.send(new GetCommand({
    TableName: cfg.keyTable,
    Key: { keyId: sessionKey(clientId, sessionId) },
    ConsistentRead: true
  }));
  if (!out.Item || out.Item.clientId !== clientId || out.Item.expiresAt <= Math.floor(Date.now() / 1000)) return null;
  return typeof out.Item.providerKeyId === "string" ? out.Item.providerKeyId : null;
}

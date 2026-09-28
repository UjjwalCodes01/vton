import fs from "node:fs";
import readline from "node:readline";
import { createHash } from "node:crypto";
import {
  CreateSecretCommand,
  PutSecretValueCommand,
  SecretsManagerClient
} from "@aws-sdk/client-secrets-manager";
import {
  DynamoDBDocumentClient,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { cfg } from "../src/config.js";

const file = process.argv[2];
if (!file) throw new Error("Usage: npm run import:keys -- FILE [--provider NAME] [--limit N] [--dry-run]");

let defaultProvider: string | undefined;
let limit = Infinity;
let dryRun = false;
const args = process.argv.slice(3);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--provider") defaultProvider = args[++i];
  else if (arg === "--limit") limit = Number(args[++i]);
  else if (arg === "--dry-run") dryRun = true;
  else throw new Error(`Unknown option: ${arg}`);
}
if (defaultProvider && !/^[A-Za-z0-9._\-]{1,100}$/.test(defaultProvider)) {
  throw new Error("--provider must be 1-100 letters, digits, dots, underscores or hyphens");
}
if (!Number.isSafeInteger(limit) && limit !== Infinity || limit <= 0) {
  throw new Error("--limit must be a positive integer");
}

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: cfg.region }));
const sm = new SecretsManagerClient({ region: cfg.region });

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur.trim()); cur = "";
    } else {
      cur += ch;
    }
  }
  if (quoted) throw new Error("Unterminated CSV quote");
  out.push(cur.trim());
  return out;
}

const input = fs.createReadStream(file, { encoding: "utf8" });
const rl = readline.createInterface({ input, crlfDelay: Infinity });
let headers: string[] | null = null;
let rowNumber = 0;
let processed = 0;

for await (const raw of rl) {
  const line = raw.trim();
  if (!line) continue;
  rowNumber++;

  if (!headers) {
    // Google Sheets / Excel exports may start with a UTF-8 BOM.
    headers = parseCsvLine(line.replace(/^\uFEFF/, "")).map((x) => x.trim().toLowerCase().replace(/\s+/g, "_"));
    for (const col of ["api_key"]) {
      if (!headers.includes(col)) throw new Error(`CSV header must include ${col}; got: ${headers.join(",")}`);
    }
    if (headers.filter((name) => name === "api_key").length !== 1) {
      throw new Error("CSV must have exactly one API Key column");
    }
    if (!headers.includes("provider") && !defaultProvider) {
      throw new Error("CSV has no provider column; pass --provider NAME");
    }
    continue;
  }

  const row = parseCsvLine(line);
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  const apiKey = row[idx.api_key];
  const keyId = idx.key_id === undefined
    ? `key-${createHash("sha256").update(apiKey ?? "").digest("hex").slice(0, 20)}`
    : row[idx.key_id];
  const provider = idx.provider === undefined ? defaultProvider : row[idx.provider];
  const apiSecret = idx.api_secret !== undefined ? row[idx.api_secret] : undefined;

  if (!keyId || !provider || !apiKey) {
    throw new Error(`Invalid CSV row ${rowNumber}: key_id/provider/api_key required`);
  }

  if (!/^[A-Za-z0-9._\-/:]{1,200}$/.test(keyId)) {
    throw new Error(`Invalid key_id at row ${rowNumber}`);
  }
  if (!/^[A-Za-z0-9._\-]{1,100}$/.test(provider)) {
    throw new Error(`Invalid provider at row ${rowNumber}`);
  }

  processed++;
  if (dryRun) {
    if (processed >= limit) break;
    continue;
  }

  const secretId = `${cfg.secretPrefix}/${provider}/${keyId}`;
  const secretString = JSON.stringify({
    api_key: apiKey,
    ...(apiSecret ? { api_secret: apiSecret } : {})
  });

  try {
    await sm.send(new CreateSecretCommand({
      Name: secretId,
      Description: `Provider credential ${keyId}`,
      SecretString: secretString,
      ...(cfg.secretsKmsKeyArn ? { KmsKeyId: cfg.secretsKmsKeyArn } : {})
    }));
  } catch (error) {
    if ((error as { name?: string }).name !== "ResourceExistsException") throw error;
    await sm.send(new PutSecretValueCommand({
      SecretId: secretId,
      SecretString: secretString
    }));
  }

  // Re-importing (e.g. rotating a key's value) must not reset health state:
  // a key quarantined as QUOTA_EXHAUSTED/AUTH_FAILED stays quarantined until keys:enable.
  const now = Math.floor(Date.now() / 1000);
  const out = await db.send(new UpdateCommand({
    TableName: cfg.keyTable,
    Key: { keyId },
    UpdateExpression:
      "SET #provider = :provider, secretId = :secretId, importedAt = :now, " +
      "#status = if_not_exists(#status, :active), eligibleAt = if_not_exists(eligibleAt, :zero), " +
      "failureCount = if_not_exists(failureCount, :zero), totalRequests = if_not_exists(totalRequests, :zero), " +
      "successfulRequests = if_not_exists(successfulRequests, :zero)",
    ExpressionAttributeNames: { "#status": "status", "#provider": "provider" },
    ExpressionAttributeValues: { ":provider": provider, ":secretId": secretId, ":now": now, ":active": "ACTIVE", ":zero": 0 },
    ReturnValues: "ALL_NEW"
  }));

  const status = out.Attributes?.status;
  if (status && status !== "ACTIVE" && status !== "TEMP_DISABLED") {
    console.log(`imported ${keyId} (status kept: ${status}; run keys:enable -- ${keyId} to put it back in the pool)`);
    if (processed >= limit) break;
    continue;
  }
  console.log(`imported ${keyId}`);
  if (processed >= limit) break;
}

if (!headers) throw new Error("CSV is empty");
if (dryRun) console.log(`Validated ${processed} key rows; no AWS writes made.`);

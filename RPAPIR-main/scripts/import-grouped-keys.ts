import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  CreateSecretCommand,
  DescribeSecretCommand,
  PutSecretValueCommand,
  SecretsManagerClient
} from "@aws-sdk/client-secrets-manager";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { cfg } from "../src/config.js";

const file = process.argv[2];
const provider = process.argv[3];
let dryRun = false;
let replaceExisting = false;
let groupStart = 0;
const usage = "Usage: npm run import:grouped -- FILE PROVIDER [--group-start N] [--dry-run] [--replace-existing]";
if (!file || !provider || !/^[A-Za-z0-9._-]{1,100}$/.test(provider)) throw new Error(usage);
for (let i = 4; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === "--dry-run") dryRun = true;
  else if (arg === "--replace-existing") replaceExisting = true;
  else if (arg === "--group-start") {
    groupStart = Number(process.argv[++i]);
    if (!Number.isSafeInteger(groupStart) || groupStart < 0) throw new Error(usage);
  } else throw new Error(usage);
}

const GROUP_COUNT = 4;
const MAX_SECRET_BYTES = 65536;
const sm = new SecretsManagerClient({ region: cfg.region });
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: cfg.region }));

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      fields.push(field.trim());
      field = "";
    } else {
      field += ch;
    }
  }
  if (quoted) throw new Error("Unterminated CSV quote");
  fields.push(field.trim());
  return fields;
}

const lines = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
if (lines.length < 2) throw new Error("CSV has no key rows");
const headers = parseCsvLine(lines[0]!).map((x) => x.toLowerCase().replace(/\s+/g, "_"));
if (headers.filter((x) => x === "api_key").length !== 1) throw new Error("CSV needs exactly one API Key column");
const apiKeyIndex = headers.indexOf("api_key");
const idIndex = headers.indexOf("key_id");
const groups = Array.from({ length: GROUP_COUNT }, () => ({} as Record<string, string>));
const seen = new Set<string>();

for (let i = 1; i < lines.length; i++) {
  const fields = parseCsvLine(lines[i]!);
  if (fields.length !== headers.length) throw new Error(`CSV column count mismatch at row ${i + 1}`);
  const apiKey = fields[apiKeyIndex];
  if (!apiKey) throw new Error(`Blank API Key at row ${i + 1}`);
  const keyId = idIndex < 0
    ? `key-${createHash("sha256").update(apiKey).digest("hex").slice(0, 20)}`
    : fields[idIndex];
  if (!keyId || !/^[A-Za-z0-9._\-/:]{1,200}$/.test(keyId)) throw new Error(`Invalid key ID at row ${i + 1}`);
  if (seen.has(keyId)) throw new Error(`Duplicate key ID at row ${i + 1}`);
  seen.add(keyId);
  const bucket = createHash("sha256").update(keyId).digest().readUInt32BE(0) % GROUP_COUNT;
  groups[bucket]![keyId] = apiKey;
}

const names = groups.map((_, i) => `${cfg.secretPrefix}/${provider}/group-${groupStart + i}`);
const bodies = groups.map((keys) => JSON.stringify({ keys }));
for (let i = 0; i < bodies.length; i++) {
  const bytes = Buffer.byteLength(bodies[i]!, "utf8");
  if (bytes > MAX_SECRET_BYTES) throw new Error(`Group ${i} is ${bytes} bytes; exceeds Secrets Manager limit`);
}

console.log(`Validated ${seen.size} unique API keys in ${GROUP_COUNT} groups: ${groups.map((g) => Object.keys(g).length).join(", ")} records.`);
if (dryRun) {
  console.log("Dry run complete; no AWS writes made.");
  process.exit(0);
}
if (!cfg.secretsKmsKeyArn) throw new Error("SECRETS_KMS_KEY_ARN is required for grouped import");

// Check every destination before writing the first group. A partial CSV must
// never silently replace a group still referenced by other key records.
if (!replaceExisting) {
  for (const name of names) {
    try {
      await sm.send(new DescribeSecretCommand({ SecretId: name }));
      throw new Error(`Secret group ${name} already exists; choose a new --group-start`);
    } catch (error) {
      if ((error as { name?: string }).name !== "ResourceNotFoundException") throw error;
    }
  }
}

// Publish every complete group before changing any key record, so a failure
// never points a runtime record at a missing secret.
for (let i = 0; i < GROUP_COUNT; i++) {
  try {
    await sm.send(new CreateSecretCommand({
      Name: names[i],
      Description: `${provider} provider credential group ${i}`,
      SecretString: bodies[i],
      KmsKeyId: cfg.secretsKmsKeyArn
    }));
  } catch (error) {
    if ((error as { name?: string }).name !== "ResourceExistsException") throw error;
    if (!replaceExisting) {
      throw new Error(`Secret group ${names[i]} already exists; choose a new --group-start or explicitly use --replace-existing with the complete group CSV`);
    }
    await sm.send(new PutSecretValueCommand({ SecretId: names[i], SecretString: bodies[i] }));
  }
  console.log(`Stored group ${i + 1}/${GROUP_COUNT}.`);
}

let imported = 0;
for (let i = 0; i < GROUP_COUNT; i++) {
  for (const keyId of Object.keys(groups[i]!)) {
    await db.send(new UpdateCommand({
      TableName: cfg.keyTable,
      Key: { keyId },
      UpdateExpression:
        "SET #provider = :provider, secretId = :secretId, secretKeyId = :keyId, importedAt = :now, " +
        "#status = if_not_exists(#status, :active), eligibleAt = if_not_exists(eligibleAt, :zero), " +
        "failureCount = if_not_exists(failureCount, :zero), totalRequests = if_not_exists(totalRequests, :zero), " +
        "successfulRequests = if_not_exists(successfulRequests, :zero)",
      ExpressionAttributeNames: { "#provider": "provider", "#status": "status" },
      ExpressionAttributeValues: {
        ":provider": provider, ":secretId": names[i], ":keyId": keyId,
        ":now": Math.floor(Date.now() / 1000), ":active": "ACTIVE", ":zero": 0
      }
    }));
    imported++;
    if (imported % 100 === 0 || imported === seen.size) console.log(`Linked ${imported}/${seen.size} key records.`);
  }
}
console.log(`Grouped import complete: ${imported} key records.`);

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DescribeSecretCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { cfg } from "../src/config.js";

const provider = process.argv[2];
const expected = Number(process.argv[3]);
if (!provider || !/^[A-Za-z0-9._-]{1,100}$/.test(provider) ||
    !Number.isSafeInteger(expected) || expected <= 0) {
  throw new Error("Usage: npm run verify:grouped -- PROVIDER EXPECTED_COUNT");
}

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: cfg.region }));
const sm = new SecretsManagerClient({ region: cfg.region });
const counts = new Map<string, number>();
const statuses = new Map<string, number>();
let count = 0;
let start: Record<string, unknown> | undefined;

do {
  const page = await db.send(new ScanCommand({
    TableName: cfg.keyTable,
    ProjectionExpression: "keyId, #provider, secretId, secretKeyId, #status",
    ExpressionAttributeNames: { "#provider": "provider", "#status": "status" },
    ExclusiveStartKey: start
  }));
  for (const row of page.Items ?? []) {
    if (row.provider !== provider) continue;
    if (typeof row.keyId !== "string" || row.secretKeyId !== row.keyId ||
        typeof row.secretId !== "string" || !row.secretId.startsWith(`${cfg.secretPrefix}/${provider}/group-`)) {
      throw new Error("Found a provider key without a valid grouped-secret reference");
    }
    count++;
    counts.set(row.secretId, (counts.get(row.secretId) ?? 0) + 1);
    statuses.set(String(row.status), (statuses.get(String(row.status)) ?? 0) + 1);
  }
  start = page.LastEvaluatedKey as Record<string, unknown> | undefined;
} while (start);

if (count !== expected) throw new Error(`Expected ${expected} grouped key records, found ${count}`);
if (counts.size === 0) throw new Error("No grouped secrets found");
for (const secretId of counts.keys()) {
  const metadata = await sm.send(new DescribeSecretCommand({ SecretId: secretId }));
  if (metadata.DeletedDate) throw new Error(`Grouped secret is scheduled for deletion: ${secretId}`);
}
console.log(`Verified ${count} grouped key records across ${counts.size} live secrets.`);
console.log(`Key states: ${[...statuses].map(([state, value]) => `${state}=${value}`).join(", ")}`);

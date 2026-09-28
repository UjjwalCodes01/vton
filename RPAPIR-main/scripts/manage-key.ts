import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../src/aws.js";
import { cfg } from "../src/config.js";

const command = process.argv[2];
const keyId = process.argv[3];

if (!command || !["list", "disable", "enable"].includes(command)) {
  throw new Error("Usage: npm run keys:list | npm run keys:disable -- KEY_ID | npm run keys:enable -- KEY_ID");
}

if (command === "list") {
  let lastKey: Record<string, unknown> | undefined;
  do {
    const out = await ddb.send(new QueryCommand({
      TableName: cfg.keyTable,
      IndexName: "provider-eligible-index",
      KeyConditionExpression: "#provider = :provider",
      ExpressionAttributeValues: { ":provider": cfg.providerName },
      ExclusiveStartKey: lastKey,
      ProjectionExpression: "keyId, label, #status, eligibleAt, lastFailureAt, lastErrorClass, lastUsedAt, totalRequests, successfulRequests",
      ExpressionAttributeNames: {
        "#provider": "provider",
        "#status": "status"
      }
    }));
    for (const item of out.Items ?? []) {
      console.log(JSON.stringify(item));
    }
    lastKey = out.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  process.exit(0);
}

if (!keyId) throw new Error("keyId required");

async function update(input: ConstructorParameters<typeof UpdateCommand>[0]): Promise<void> {
  try {
    // Without this condition a mistyped keyId would silently create a stray row.
    await ddb.send(new UpdateCommand({ ...input, ConditionExpression: "attribute_exists(keyId)" }));
  } catch (error) {
    if ((error as { name?: string }).name === "ConditionalCheckFailedException") {
      console.error(`no such key: ${keyId}`);
      process.exit(1);
    }
    throw error;
  }
}

if (command === "enable") {
  await update({
    TableName: cfg.keyTable,
    Key: { keyId },
    UpdateExpression: "SET #status = :active, eligibleAt = :zero REMOVE disabledUntil, disabledBy, disabledFromStatus, leaseUntil, leaseId",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: { ":active": "ACTIVE", ":zero": 0 }
  });
  console.log(`enabled ${keyId}`);
}

if (command === "disable") {
  await update({
    TableName: cfg.keyTable,
    Key: { keyId },
    UpdateExpression: "SET #status = :disabled, eligibleAt = :eligibleAt, disabledUntil = :eligibleAt, disabledBy = :cli REMOVE leaseUntil, leaseId",
    ExpressionAttributeNames: { "#status": "status" },
    // disabledBy = "cli" means the sheet sync will not re-enable this key.
    ExpressionAttributeValues: { ":disabled": "DISABLED", ":eligibleAt": cfg.permanentEligibleAt, ":cli": "cli" }
  });
  console.log(`disabled ${keyId}`);
}

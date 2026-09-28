import crypto from "node:crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../src/aws.js";
import { cfg } from "../src/config.js";

const clientId = process.argv[2];
if (!clientId) throw new Error("Usage: npm run create:client -- friend-1");
if (!/^[A-Za-z0-9._-]{1,64}$/.test(clientId)) throw new Error("clientId must be 1-64 chars: A-Z a-z 0-9 . _ -");

const token = crypto.randomBytes(32).toString("base64url");
const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

await ddb.send(new PutCommand({
  TableName: cfg.clientTable,
  Item: {
    clientId,
    tokenHash,
    createdAt: Math.floor(Date.now() / 1000)
  },
  ConditionExpression: "attribute_not_exists(clientId)"
}));

console.log("\nSAVE THIS ONCE. The raw client token is not stored in DynamoDB and cannot be recovered from the database.\n");
console.log(`CLIENT_ID=${clientId}`);
console.log(`CLIENT_TOKEN=${token}`);

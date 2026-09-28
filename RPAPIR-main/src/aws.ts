import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { cfg } from "./config.js";

export const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: cfg.region }),
  { marshallOptions: { removeUndefinedValues: true } }
);

export const secrets = new SecretsManagerClient({ region: cfg.region });

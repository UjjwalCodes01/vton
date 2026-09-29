import { createHash, timingSafeEqual } from "node:crypto";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import {
  RekognitionClient,
  DetectFacesCommand,
  DetectLabelsCommand,
  DetectModerationLabelsCommand,
  RecognizeCelebritiesCommand,
} from "@aws-sdk/client-rekognition";

const ddb = new DynamoDBClient({});
const rekognition = new RekognitionClient({});
const commands = {
  DetectFaces: DetectFacesCommand,
  DetectLabels: DetectLabelsCommand,
  DetectModerationLabels: DetectModerationLabelsCommand,
  RecognizeCelebrities: RecognizeCelebritiesCommand,
};
const MAX_BYTES = 4 * 1024 * 1024;

function reply(statusCode, value) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(value),
  };
}

async function authenticated(headers = {}) {
  const id = headers["x-client-id"];
  const token = headers["x-client-token"];
  if (typeof id !== "string" || !id || id.length > 128 ||
      typeof token !== "string" || !token || token.length > 512) return false;
  const out = await ddb.send(new GetItemCommand({
    TableName: process.env.CLIENT_TABLE_NAME,
    Key: { clientId: { S: id } },
    ConsistentRead: true,
    ProjectionExpression: "tokenHash, revokedAt",
  }));
  if (out.Item?.revokedAt || !/^[a-f0-9]{64}$/i.test(out.Item?.tokenHash?.S || "")) return false;
  const expected = Buffer.from(out.Item.tokenHash.S, "hex");
  const actual = createHash("sha256").update(token).digest();
  return timingSafeEqual(actual, expected);
}

export async function handler(event) {
  try {
    if (event.requestContext?.http?.method !== "POST" || event.rawPath !== "/v1/screen") {
      return reply(404, { error: "not_found" });
    }
    if (!await authenticated(event.headers)) return reply(401, { error: "unauthorized" });
    if (event.isBase64Encoded || !event.body || event.body.length > 5_700_000) {
      return reply(413, { error: "image_too_large" });
    }
    let body;
    try { body = JSON.parse(event.body); } catch { return reply(400, { error: "invalid_request" }); }
    const Command = commands[body.action];
    if (!Command || typeof body.image !== "string" ||
        body.image.length > Math.ceil(MAX_BYTES / 3) * 4 + 4 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(body.image)) {
      return reply(400, { error: "invalid_request" });
    }
    const bytes = Buffer.from(body.image, "base64");
    if (!bytes.length || bytes.length > MAX_BYTES) return reply(413, { error: "image_too_large" });
    const options = {};
    if (body.action === "DetectFaces") options.Attributes = ["AGE_RANGE"];
    if (body.action === "DetectLabels") {
      options.MaxLabels = 50;
      options.MinConfidence = 60;
    }
    if (body.action === "DetectModerationLabels") options.MinConfidence = 30;
    const result = await rekognition.send(new Command({ Image: { Bytes: bytes }, ...options }));
    // Provider metadata is not required by the web backend.
    const { $metadata, ...data } = result;
    return reply(200, data);
  } catch {
    // Never log image bytes, headers, provider responses, or signed URLs.
    return reply(503, { error: "safety_unavailable" });
  }
}

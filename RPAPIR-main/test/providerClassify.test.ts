import assert from "node:assert/strict";
import test from "node:test";
import { classifyProviderResponse } from "../src/providerClassify.js";

test("Perfect Corp credit exhaustion rotates but invalid input does not", () => {
  assert.equal(classifyProviderResponse(400, '{"error_code":"CreditInsufficiency"}'), "quota");
  assert.equal(classifyProviderResponse(400, '{"error_code":"invalid_parameter"}'), "error");
});

test("rate limits cool down while invalid credentials are quarantined", () => {
  assert.equal(classifyProviderResponse(429, '{"error":"Too Many Requests"}'), "temporary");
  assert.equal(classifyProviderResponse(401, '{"error_code":"InvalidAccessToken"}'), "auth");
});

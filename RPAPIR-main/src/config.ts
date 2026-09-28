const envBool = (name: string, fallback: boolean): boolean => {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
};

const envInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
};

// Upstream settings live in upstream.ts so admin scripts and the sheet sync
// can load this module without UPSTREAM_BASE_URL.
export const cfg = {
  region: process.env.AWS_REGION ?? "us-east-1",
  keyTable: process.env.DDB_TABLE_NAME ?? "api-key-pool-keys",
  clientTable: process.env.CLIENT_TABLE_NAME ?? "api-key-pool-clients",
  secretPrefix: process.env.KEY_SECRET_PREFIX ?? "api-key-pool/providers",
  providerName: process.env.PROVIDER_NAME ?? "provider-x",
  timeoutMs: envInt("UPSTREAM_TIMEOUT_MS", 12000),
  maxAttempts: envInt("MAX_UPSTREAM_ATTEMPTS", 4),
  maxRequestBodyBytes: envInt("MAX_REQUEST_BODY_BYTES", 262144),
  maxUpstreamResponseBytes: envInt("MAX_UPSTREAM_RESPONSE_BYTES", 1048576),
  candidateLimit: envInt("KEY_CANDIDATE_LIMIT", 50),
  leaseSeconds: envInt("LEASE_SECONDS", 30),
  tempDisableSeconds: envInt("TEMP_DISABLE_SECONDS", 60),
  permanentDisableAfterAuth: envBool("PERMANENT_DISABLE_AFTER_AUTH", true),
  requireClientToken: envBool("REQUIRE_CLIENT_TOKEN", true),
  secretsKmsKeyArn: process.env.SECRETS_KMS_KEY_ARN?.trim() || undefined,
  sheetId: process.env.SHEET_ID?.trim() || undefined,
  sheetRange: process.env.SHEET_RANGE?.trim() || "Keys",
  googleSaSecretId: process.env.GOOGLE_SA_SECRET_ID?.trim() || undefined,
  permanentEligibleAt: 32503680000 // 3000-01-01T00:00:00Z
};

export function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

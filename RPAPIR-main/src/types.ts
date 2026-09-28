// DISABLED is set only by an operator (keys:disable or the sheet sync), never by request handling.
export type KeyStatus = "ACTIVE" | "QUOTA_EXHAUSTED" | "AUTH_FAILED" | "TEMP_DISABLED" | "DISABLED";

export interface KeyRecord {
  keyId: string;
  provider: string;
  secretId: string;
  secretKeyId?: string;
  label?: string;
  status: KeyStatus;
  eligibleAt: number;
  leaseUntil?: number;
  leaseId?: string;
  disabledUntil?: number;
  disabledBy?: "cli" | "sheet";
  disabledFromStatus?: KeyStatus;
  failureCount?: number;
  lastFailureAt?: number;
  lastErrorClass?: string;
  lastUsedAt?: number;
  importedAt?: number;
  totalRequests?: number;
  successfulRequests?: number;
}

export interface LeasedKey extends KeyRecord {
  leaseId: string;
}

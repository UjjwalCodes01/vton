import { DescribeSecretCommand } from "@aws-sdk/client-secrets-manager";
import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, secrets } from "./aws.js";
import { cfg } from "./config.js";
import type { KeyRecord, KeyStatus } from "./types.js";

// Reconciles the operator's Google Sheet inventory into the DynamoDB key table.
//
// The sheet owns: which keys exist (by key_id/provider), their label, and the
// operator on/off switch. DynamoDB stays the source of truth for health and
// lease state; the sync never touches eligibility of healthy/quarantined keys
// except to apply or lift an operator disable it made itself.
//
// The sheet never holds credential values. Secrets are loaded with
// `npm run import:keys`; a sheet row whose secret is missing is reported, not created.

export interface SheetRow {
  rowNumber: number;
  keyId: string;
  provider: string;
  label?: string;
  disabled: boolean;
}

export interface SyncReport {
  dryRun: boolean;
  sheetRows: number;
  created: string[];
  disabled: string[];
  enabled: string[];
  relabeled: string[];
  unchanged: number;
  missingSecret: string[];
  notInSheet: string[];
  skipped: string[];
  errors: string[];
}

const SECRET_COLUMNS = ["api_key", "apikey", "api_secret", "secret", "token", "password", "key"];
const KEY_ID_RE = /^[A-Za-z0-9._\-/:]{1,200}$/;
const PROVIDER_RE = /^[A-Za-z0-9._\-]{1,100}$/;

export function parseSheet(values: string[][]): { rows: SheetRow[]; errors: string[] } {
  const [headerRow, ...body] = values;
  if (!headerRow) throw new Error("Sheet is empty; expected a header row: key_id | provider | label | operator_status");

  const headers = headerRow.map((h) => h.replace(/^﻿/, "").trim().toLowerCase());
  const leaked = headers.filter((h) => SECRET_COLUMNS.includes(h));
  if (leaked.length > 0) {
    throw new Error(
      `Refusing to sync: the sheet has credential column(s) ${leaked.join(", ")}. ` +
      "Import keys with `npm run import:keys`, then delete those columns from the sheet."
    );
  }
  const col = (name: string) => headers.indexOf(name);
  if (col("key_id") < 0 || col("provider") < 0) throw new Error("Sheet header must include key_id and provider");

  const errors: string[] = [];
  const parsed: SheetRow[] = [];
  body.forEach((cells, i) => {
    const rowNumber = i + 2; // 1-based, after the header
    const cell = (name: string) => (col(name) >= 0 ? (cells[col(name)] ?? "").trim() : "");
    const keyId = cell("key_id");
    const provider = cell("provider");
    if (!keyId && !provider) return; // blank row

    if (!KEY_ID_RE.test(keyId)) return void errors.push(`row ${rowNumber}: invalid key_id`);
    if (!PROVIDER_RE.test(provider)) return void errors.push(`row ${rowNumber}: invalid provider`);

    const status = cell("operator_status").toLowerCase();
    if (!["", "active", "disabled"].includes(status)) {
      return void errors.push(`row ${rowNumber}: operator_status must be active, disabled or blank`);
    }

    const label = cell("label").slice(0, 200) || undefined;
    parsed.push({ rowNumber, keyId, provider, label, disabled: status === "disabled" });
  });

  // A duplicated key_id is ambiguous; skip every copy rather than guess.
  const counts = new Map<string, number>();
  for (const row of parsed) counts.set(row.keyId, (counts.get(row.keyId) ?? 0) + 1);
  const rows = parsed.filter((row) => {
    if (counts.get(row.keyId) === 1) return true;
    errors.push(`row ${row.rowNumber}: duplicate key_id ${row.keyId}`);
    return false;
  });

  return { rows, errors };
}

async function loadProviderKeys(provider: string): Promise<KeyRecord[]> {
  const items: KeyRecord[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const out = await ddb.send(new QueryCommand({
      TableName: cfg.keyTable,
      IndexName: "provider-eligible-index",
      KeyConditionExpression: "#provider = :provider",
      ExpressionAttributeNames: { "#provider": "provider" },
      ExpressionAttributeValues: { ":provider": provider },
      ExclusiveStartKey: exclusiveStartKey
    }));
    items.push(...((out.Items ?? []) as KeyRecord[]));
    exclusiveStartKey = out.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey);
  return items;
}

async function secretExists(secretId: string): Promise<boolean> {
  try {
    const out = await secrets.send(new DescribeSecretCommand({ SecretId: secretId }));
    return !out.DeletedDate;
  } catch (error) {
    if ((error as { name?: string }).name === "ResourceNotFoundException") return false;
    throw error;
  }
}

const isConditionFailure = (error: unknown) =>
  (error as { name?: string }).name === "ConditionalCheckFailedException";

/** Where a sheet-disabled key goes back to when re-enabled: quarantines survive a disable/enable cycle. */
function restoreTarget(from: KeyStatus | undefined): { status: KeyStatus; eligibleAt: number } {
  if (from === "QUOTA_EXHAUSTED" || from === "AUTH_FAILED") return { status: from, eligibleAt: cfg.permanentEligibleAt };
  return { status: "ACTIVE", eligibleAt: 0 };
}

export async function syncSheet(rows: SheetRow[], opts: { dryRun: boolean }): Promise<SyncReport> {
  const report: SyncReport = {
    dryRun: opts.dryRun, sheetRows: rows.length, created: [], disabled: [], enabled: [], relabeled: [],
    unchanged: 0, missingSecret: [], notInSheet: [], skipped: [], errors: []
  };

  const existing = new Map<string, KeyRecord>();
  const providers = [...new Set(rows.map((r) => r.provider))];
  for (const provider of providers) {
    for (const item of await loadProviderKeys(provider)) existing.set(item.keyId, item);
  }

  const inSheet = new Set(rows.map((r) => r.keyId));
  report.notInSheet = [...existing.keys()].filter((id) => !inSheet.has(id)).sort();

  const write = async (id: string, list: string[], op: () => Promise<unknown>) => {
    if (opts.dryRun) return void list.push(id);
    try {
      await op();
      list.push(id);
    } catch (error) {
      // The key changed between our read and write (e.g. a request quarantined it), or a new
      // key_id already exists under another provider. Either way, leave it for the next run.
      if (isConditionFailure(error)) return void report.skipped.push(`${id}: changed concurrently or exists under another provider`);
      throw error;
    }
  };

  for (const row of rows) {
    const item = existing.get(row.keyId);

    if (!item) {
      const secretId = `${cfg.secretPrefix}/${row.provider}/${row.keyId}`;
      if (!(await secretExists(secretId))) {
        report.missingSecret.push(row.keyId);
        continue;
      }
      await write(row.keyId, report.created, () => ddb.send(new PutCommand({
        TableName: cfg.keyTable,
        Item: {
          keyId: row.keyId,
          provider: row.provider,
          secretId,
          label: row.label,
          ...(row.disabled
            ? { status: "DISABLED", eligibleAt: cfg.permanentEligibleAt, disabledBy: "sheet", disabledFromStatus: "ACTIVE" }
            : { status: "ACTIVE", eligibleAt: 0 }),
          importedAt: Math.floor(Date.now() / 1000),
          failureCount: 0,
          totalRequests: 0,
          successfulRequests: 0
        },
        // Also rejects a key_id that already exists under a different provider.
        ConditionExpression: "attribute_not_exists(keyId)"
      })));
      continue;
    }

    let changed = false;

    if ((row.label ?? "") !== (item.label ?? "")) {
      changed = true;
      await write(row.keyId, report.relabeled, () => ddb.send(new UpdateCommand({
        TableName: cfg.keyTable,
        Key: { keyId: row.keyId },
        UpdateExpression: row.label ? "SET label = :label" : "REMOVE label",
        ConditionExpression: "attribute_exists(keyId)",
        ExpressionAttributeValues: row.label ? { ":label": row.label } : undefined
      })));
    }

    if (row.disabled && item.status !== "DISABLED") {
      changed = true;
      await write(row.keyId, report.disabled, () => ddb.send(new UpdateCommand({
        TableName: cfg.keyTable,
        Key: { keyId: row.keyId },
        UpdateExpression:
          "SET #status = :disabled, #eligibleAt = :never, disabledBy = :sheet, disabledFromStatus = :prev REMOVE leaseUntil, leaseId",
        ConditionExpression: "#status = :prev",
        ExpressionAttributeNames: { "#status": "status", "#eligibleAt": "eligibleAt" },
        ExpressionAttributeValues: {
          ":disabled": "DISABLED", ":never": cfg.permanentEligibleAt, ":sheet": "sheet", ":prev": item.status
        }
      })));
    } else if (!row.disabled && item.status === "DISABLED") {
      if (item.disabledBy !== "sheet") {
        // Disabled by an operator via keys:disable; only keys:enable lifts that.
        report.skipped.push(`${row.keyId}: disabled via CLI; run keys:enable to re-enable`);
        continue;
      } else {
        changed = true;
        const target = restoreTarget(item.disabledFromStatus);
        await write(row.keyId, report.enabled, () => ddb.send(new UpdateCommand({
          TableName: cfg.keyTable,
          Key: { keyId: row.keyId },
          UpdateExpression: "SET #status = :status, #eligibleAt = :eligibleAt REMOVE disabledBy, disabledFromStatus, disabledUntil",
          ConditionExpression: "#status = :disabled AND disabledBy = :sheet",
          ExpressionAttributeNames: { "#status": "status", "#eligibleAt": "eligibleAt" },
          ExpressionAttributeValues: {
            ":status": target.status, ":eligibleAt": target.eligibleAt, ":disabled": "DISABLED", ":sheet": "sheet"
          }
        })));
      }
    }

    if (!changed) report.unchanged++;
  }

  return report;
}

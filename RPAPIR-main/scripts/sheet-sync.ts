import { cfg, required } from "../src/config.js";
import { fetchSheetValues, loadServiceAccount } from "../src/googleSheets.js";
import { parseSheet, syncSheet } from "../src/sheetSync.js";

const dryRun = process.argv.includes("--dry-run");

const sa = await loadServiceAccount({
  file: process.env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim() || undefined,
  secretId: cfg.googleSaSecretId
});
const values = await fetchSheetValues(sa, required("SHEET_ID"), cfg.sheetRange);
const { rows, errors } = parseSheet(values);
const report = await syncSheet(rows, { dryRun });
report.errors.push(...errors);

const line = (label: string, ids: string[]) => {
  if (ids.length > 0) console.log(`${label} (${ids.length}): ${ids.join(", ")}`);
};

console.log(dryRun ? "DRY RUN — no changes written\n" : "");
console.log(`sheet rows: ${report.sheetRows}, unchanged: ${report.unchanged}`);
line(dryRun ? "would create" : "created", report.created);
line(dryRun ? "would disable" : "disabled", report.disabled);
line(dryRun ? "would enable" : "enabled", report.enabled);
line(dryRun ? "would relabel" : "relabeled", report.relabeled);
line("missing secret — run import:keys first", report.missingSecret);
line("in DynamoDB but not in sheet (left alone)", report.notInSheet);
line("skipped", report.skipped);
line("sheet errors", report.errors);

if (report.errors.length > 0) process.exitCode = 1;

import { cfg, required } from "./config.js";
import { fetchSheetValues, loadServiceAccount } from "./googleSheets.js";
import { parseSheet, syncSheet } from "./sheetSync.js";

// Scheduled (EventBridge) entry point. Logs key IDs and counts only.
export const handler = async () => {
  const sa = await loadServiceAccount({ secretId: required("GOOGLE_SA_SECRET_ID") });
  const values = await fetchSheetValues(sa, required("SHEET_ID"), cfg.sheetRange);
  const { rows, errors } = parseSheet(values);
  const report = await syncSheet(rows, { dryRun: false });
  report.errors.push(...errors);

  console.log("sheet_sync", JSON.stringify(report));
  if (report.errors.length > 0 || report.missingSecret.length > 0) {
    console.warn("sheet_sync_needs_attention", {
      errors: report.errors.length,
      missingSecret: report.missingSecret.length
    });
  }
  return report;
};

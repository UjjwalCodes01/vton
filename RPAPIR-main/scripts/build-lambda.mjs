// Bundles each Lambda entry point (with its AWS SDK deps) into build/lambda for Terraform to zip.
import { build } from "esbuild";
import { rm, writeFile } from "node:fs/promises";

const outdir = "build/lambda";
await rm(outdir, { recursive: true, force: true });
await build({
  entryPoints: ["src/handler.ts", "src/sheetSyncHandler.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outdir,
  legalComments: "none",
  logLevel: "info"
});
// The repo root is "type": "module"; pin the bundle to CommonJS so it loads the same locally and in Lambda.
await writeFile(`${outdir}/package.json`, '{"type":"commonjs"}\n');

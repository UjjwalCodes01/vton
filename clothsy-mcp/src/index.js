#!/usr/bin/env node
// clothsy-mcp — Model Context Protocol server that helps AI coding agents add
// Clothsy AI virtual try-on to a store. Speaks JSON-RPC over stdio; logs go to stderr.

import { createServer, serveStdio } from "./protocol.js";
import { INSTRUCTIONS, PROMPTS, RESOURCES, SERVER_NAME, SERVER_VERSION, TOOLS } from "./tools.js";

const args = process.argv.slice(2);
if (args.includes("--version") || args.includes("-v")) {
  process.stdout.write(`${SERVER_VERSION}\n`);
  process.exit(0);
}
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(`${SERVER_NAME} ${SERVER_VERSION}

An MCP server (stdio) that helps AI coding agents add Clothsy AI virtual try-on to a store.
Start it from an MCP client, e.g.:

  claude mcp add clothsy --env CLOTHSY_API_KEY=clothsy_live_... -- npx -y clothsy-mcp

Environment:
  CLOTHSY_API_KEY   optional; only clothsy_check_setup and clothsy_test_tryon use it
  CLOTHSY_DEBUG=1   log protocol activity to stderr

Docs: https://clothsyai.fabricvton.com/docs/api/mcp
`);
  process.exit(0);
}

const debug = process.env.CLOTHSY_DEBUG === "1";
/** @param {string} message */
const log = (message) => {
  if (debug) process.stderr.write(`[${SERVER_NAME}] ${message}\n`);
};

const server = createServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
  instructions: INSTRUCTIONS,
  tools: TOOLS,
  resources: RESOURCES,
  prompts: PROMPTS,
  env: process.env,
  log,
});

log(`ready (node ${process.version})`);
await serveStdio(server, { log });
log("stdin closed; exiting");
// Let queued stdout writes flush before exiting (pipes can be async on some platforms).
process.exitCode = 0;
setTimeout(() => process.exit(0), 2000).unref();
process.stdout.write("", () => process.exit(0));

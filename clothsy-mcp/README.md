# clothsy-mcp

An [MCP](https://modelcontextprotocol.io) server that helps AI coding agents add **Clothsy AI virtual try-on** to a store. Ask your agent "Add Clothsy try-on to my store" and it can work out your stack, fetch a complete integration plan with every file, look up the docs, explain API errors and check your API key, without leaving the editor.

Works with Claude Code, Cursor, VS Code (Copilot agent mode), Windsurf, Claude Desktop and any other MCP client that runs stdio servers.

- Zero dependencies, no build step. `npx -y clothsy-mcp` starts in well under a second on Node.js 18+.
- Offline except for two tools (`clothsy_check_setup`, `clothsy_test_tryon`), which call the Clothsy AI API with your key.
- Full docs: https://clothsyai.fabricvton.com/docs/api/mcp

> On **Shopify** or **WooCommerce**? You don't need code: install the [Shopify app](https://apps.shopify.com/fabricvton) or the [WordPress plugin](https://wordpress.org/plugins/clothsy-ai/). This server is for custom storefronts, headless commerce and apps.

## Setup

The API key is **optional**. Only `clothsy_check_setup` and `clothsy_test_tryon` use it; planning, docs and error help work without one. Get a key at https://app.clothsyai.fabricvton.com under **Developer API** (your first key adds 20 free credits).

Keep real keys out of config files you commit. Prefer your shell environment, your client's input/secret variables, or user-level config files that live outside the repo.

### Claude Code

```bash
claude mcp add clothsy --env CLOTHSY_API_KEY=clothsy_live_... -- npx -y clothsy-mcp
```

Without a key:

```bash
claude mcp add clothsy -- npx -y clothsy-mcp
```

For a project-scoped `.mcp.json` that is safe to commit, reference an environment variable instead of the key itself:

```json
{
  "mcpServers": {
    "clothsy": {
      "command": "npx",
      "args": ["-y", "clothsy-mcp"],
      "env": { "CLOTHSY_API_KEY": "${CLOTHSY_API_KEY}" }
    }
  }
}
```

### Cursor

`~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (this project):

```json
{
  "mcpServers": {
    "clothsy": {
      "command": "npx",
      "args": ["-y", "clothsy-mcp"],
      "env": { "CLOTHSY_API_KEY": "clothsy_live_..." }
    }
  }
}
```

Put the key in the user-level `~/.cursor/mcp.json`, not in a project file you commit.

### VS Code

`.vscode/mcp.json`. The `inputs` entry makes VS Code prompt for the key once and store it securely, so the file itself can be committed:

```json
{
  "inputs": [
    { "type": "promptString", "id": "clothsy-key", "description": "Clothsy AI API key", "password": true }
  ],
  "servers": {
    "clothsy": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "clothsy-mcp"],
      "env": { "CLOTHSY_API_KEY": "${input:clothsy-key}" }
    }
  }
}
```

### Windsurf

`~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "clothsy": {
      "command": "npx",
      "args": ["-y", "clothsy-mcp"],
      "env": { "CLOTHSY_API_KEY": "clothsy_live_..." }
    }
  }
}
```

### Claude Desktop

`claude_desktop_config.json` (Settings -> Developer -> Edit Config):

```json
{
  "mcpServers": {
    "clothsy": {
      "command": "npx",
      "args": ["-y", "clothsy-mcp"],
      "env": { "CLOTHSY_API_KEY": "clothsy_live_..." }
    }
  }
}
```

Restart the client after editing its config.

### Other clients

Any MCP client that launches stdio servers: command `npx`, args `["-y", "clothsy-mcp"]`, optional env `CLOTHSY_API_KEY`.

## Tools

| Tool | What it does | Network |
| --- | --- | --- |
| `clothsy_detect_stack` | Recommends an integration path from your package.json and/or a description: Shopify app, WooCommerce plugin, Next.js (SDK route helper + `TryOnButton`), Node.js (SDK + two routes), Python, or the raw HTTP API. | No |
| `clothsy_integration_plan` | Ordered steps and the full contents of every file to add or change for `nextjs`, `node`, `python` or `http`, plus env setup and a verification checklist. | No |
| `clothsy_docs` | One docs section: `overview`, `auth`, `sdk`, `nextjs`, `endpoints`, `errors`, `limits`, `images`, `consent-privacy`, `ai-label`. | No |
| `clothsy_explain_error` | Meaning, likely cause, exact fix and retry advice for an error code, HTTP status or message. | No |
| `clothsy_check_setup` | Validates `CLOTHSY_API_KEY` from the server's own environment and shows remaining credits. It takes no key argument and never prints the key. | `GET /account` |
| `clothsy_test_tryon` | Runs one real try-on from two public image URLs. **Spends 1 credit** on success, so it does nothing unless called with `confirmSpend: true`. | Yes |

**Resources:** `clothsy://docs/<topic>` for each docs topic (`text/markdown`).

**Prompt:** `add_clothsy_tryon` (optional `stack` argument) walks the agent through detection, the plan, implementation and a final `clothsy_check_setup`.

## Example

> **You:** Add Clothsy try-on to my Next.js store.
>
> **Agent:** reads package.json, calls `clothsy_detect_stack` (Next.js 15 detected), calls `clothsy_integration_plan` with `stack: "nextjs"`, creates `app/api/tryon/route.ts` wired to your product lookup, adds `TryOnButton` to the product page and a `CLOTHSY_API_KEY=` placeholder to `.env.local`, runs your type-check, then calls `clothsy_check_setup` to confirm the key and credits.

## Security

- The server reads `CLOTHSY_API_KEY` only from its own environment. No tool accepts a key as an argument, and output shows at most `clothsy_live_…`.
- Nothing is sent anywhere except `clothsy_check_setup` (`GET /account`) and `clothsy_test_tryon` (one try-on, only with `confirmSpend: true`).
- The plans always keep the key on the store's server, resolve garment images server-side, require shopper consent, and caption results as AI-generated.
- Test try-ons must use a photo of a consenting adult, such as yourself.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `CLOTHSY_API_KEY` | Optional. Your `clothsy_live_…` key, for the two tools that call the API. |
| `CLOTHSY_BASE_URL` | Optional. Override the API base URL (for testing against a mock). |
| `CLOTHSY_DEBUG=1` | Log protocol activity to stderr. |

## Development

```bash
npm test        # node:test, no dependencies, no real network
node src/index.js --version
```

The server speaks newline-delimited JSON-RPC 2.0 on stdin/stdout (protocol versions 2025-06-18, 2025-03-26 and 2024-11-05). stdout carries protocol messages only; logs go to stderr.

## License

MIT © Clothsy AI

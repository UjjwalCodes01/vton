import type { Metadata } from "next";
import Link from "next/link";
import { PLATFORM_URL, SHOPIFY_URL, WOO_URL } from "../../../lib/site";
import { Code, CodeTabs } from "../../components/Code";
import Pager from "../../components/Pager";

export const metadata: Metadata = {
  title: "MCP server — Try-on API",
  description:
    "clothsy-mcp lets AI coding agents in Claude Code, Cursor, VS Code, Windsurf and Claude Desktop add Clothsy AI virtual try-on to your store: stack detection, file-by-file plans, docs and key checks.",
  alternates: { canonical: "/docs/api/mcp" },
};

const CLAUDE_CODE = `claude mcp add clothsy --env CLOTHSY_API_KEY=clothsy_live_... -- npx -y clothsy-mcp

# or, without a key (planning, docs and error help still work):
claude mcp add clothsy -- npx -y clothsy-mcp`;

const CURSOR = `// ~/.cursor/mcp.json (every project) or .cursor/mcp.json (this project)
{
  "mcpServers": {
    "clothsy": {
      "command": "npx",
      "args": ["-y", "clothsy-mcp"],
      "env": { "CLOTHSY_API_KEY": "clothsy_live_..." }
    }
  }
}`;

const VSCODE = `// .vscode/mcp.json — VS Code asks for the key once and stores it securely
{
  "inputs": [
    { "type": "promptString", "id": "clothsy-key", "description": "Clothsy AI API key", "password": true }
  ],
  "servers": {
    "clothsy": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "clothsy-mcp"],
      "env": { "CLOTHSY_API_KEY": "\${input:clothsy-key}" }
    }
  }
}`;

const WINDSURF = `// ~/.codeium/windsurf/mcp_config.json
{
  "mcpServers": {
    "clothsy": {
      "command": "npx",
      "args": ["-y", "clothsy-mcp"],
      "env": { "CLOTHSY_API_KEY": "clothsy_live_..." }
    }
  }
}`;

const CLAUDE_DESKTOP = `// claude_desktop_config.json (Settings → Developer → Edit Config)
{
  "mcpServers": {
    "clothsy": {
      "command": "npx",
      "args": ["-y", "clothsy-mcp"],
      "env": { "CLOTHSY_API_KEY": "clothsy_live_..." }
    }
  }
}`;

const SHARED_CONFIG = `// .mcp.json — safe to commit: the key comes from each developer's shell
{
  "mcpServers": {
    "clothsy": {
      "command": "npx",
      "args": ["-y", "clothsy-mcp"],
      "env": { "CLOTHSY_API_KEY": "\${CLOTHSY_API_KEY}" }
    }
  }
}`;

const TOOLS: [name: string, what: string, network: string][] = [
  [
    "clothsy_detect_stack",
    "Reads your package.json and/or a short description and recommends a path: the Shopify app, the WooCommerce plugin, the Next.js helpers, the SDK on a Node.js server, Python, or the plain HTTP API. Explains why.",
    "None",
  ],
  [
    "clothsy_integration_plan",
    "For nextjs, node, python or http: ordered steps, the full contents of every file to add or change, environment setup and a checklist to verify the result.",
    "None",
  ],
  [
    "clothsy_docs",
    "Returns one section of these docs as Markdown: overview, auth, sdk, nextjs, endpoints, errors, limits, images, consent-privacy or ai-label.",
    "None",
  ],
  [
    "clothsy_explain_error",
    "Takes an error code, HTTP status or message and says what it means, the likely cause, the fix and whether retrying helps.",
    "None",
  ],
  [
    "clothsy_check_setup",
    "Checks the key in the server's own environment and reports your remaining credits. It has no key argument and never prints the key.",
    "GET /account",
  ],
  [
    "clothsy_test_tryon",
    "Runs one real try-on from two public image URLs and returns the result link. Spends 1 credit on success, so it refuses to run unless called with confirmSpend: true.",
    "One try-on",
  ],
];

const CONVERSATION = `You:    Add Clothsy try-on to my Next.js store.

Agent:  → clothsy_detect_stack { packageJson: "…" }
        Next.js 15 detected. Recommended: the clothsy-ai/next route helper
        with the TryOnButton component.

        → clothsy_integration_plan { stack: "nextjs",
            productLookup: "getProduct(slug) in lib/catalog.ts" }

        Created app/api/tryon/route.ts (resolveProduct uses getProduct)
        Created components/ProductTryOn.tsx
        Updated app/products/[slug]/page.tsx: button next to "Add to cart"
        Added CLOTHSY_API_KEY= to .env.local (git-ignored). Fill it in.
        Ran tsc --noEmit: no errors.

        → clothsy_check_setup
        Key is valid (clothsy_live_…). Credits remaining: 20.

        Done. Add CLOTHSY_API_KEY to your Vercel project settings too,
        then redeploy.`;

export default function McpServer() {
  return (
    <>
      <p className="eyebrow eyebrow-violet">Get started</p>
      <h1 className="display">MCP server</h1>
      <p className="lede">
        Use Claude Code, Cursor, VS Code, Windsurf or Claude Desktop? Connect <code>clothsy-mcp</code> and ask your
        agent to add try-on. It picks the right setup for your stack, writes the files and checks your key, usually in
        a few minutes.
      </p>

      <h2 id="what">What it does</h2>
      <p>
        The <a href="https://modelcontextprotocol.io">Model Context Protocol</a> is a standard way for AI coding
        assistants to call outside tools. <code>clothsy-mcp</code> gives your assistant the knowledge in these docs as
        tools it can call while it works on your code:
      </p>
      <ul>
        <li>it works out whether your project needs code at all, or just the Shopify app or WooCommerce plugin;</li>
        <li>it hands the agent a complete plan with every file to create, written for your framework;</li>
        <li>it answers questions about endpoints, limits and error codes without the agent guessing;</li>
        <li>it confirms your API key works and shows how many credits you have left.</li>
      </ul>
      <p>
        It runs on your own machine through <code>npx</code>. It has no dependencies, needs Node.js 18 or later, and
        only goes online for the two tools that talk to the API.
      </p>
      <div className="doc-note">
        On <b>Shopify</b> or <b>WooCommerce</b>? You don&apos;t need an agent: install the{" "}
        <a href={SHOPIFY_URL}>Shopify app</a> or the <a href={WOO_URL}>WordPress plugin</a>. The MCP server is for
        custom storefronts, headless commerce and apps.
      </div>

      <h2 id="install">Install</h2>
      <p>
        Add the server to your client. The API key is <b>optional</b>: without it, detection, plans, docs and error help
        all still work. You only need it for <code>clothsy_check_setup</code> and <code>clothsy_test_tryon</code>. Get
        one under Developer API in the <a href={`${PLATFORM_URL}/api-keys`}>Clothsy AI platform</a>.
      </p>
      <CodeTabs
        tabs={[
          { label: "Claude Code", code: CLAUDE_CODE },
          { label: "Cursor", code: CURSOR },
          { label: "VS Code", code: VSCODE },
          { label: "Windsurf", code: WINDSURF },
          { label: "Claude Desktop", code: CLAUDE_DESKTOP },
        ]}
      />
      <p>
        Restart the client after you edit its config. Any other MCP client that can launch a local server works the
        same way: run <code>npx -y clothsy-mcp</code>, with <code>CLOTHSY_API_KEY</code> in its environment if you want
        the key checks.
      </p>
      <p>
        Sharing the setup with your team? Commit a project config that reads the key from each person&apos;s own
        environment rather than containing it:
      </p>
      <Code title=".mcp.json" code={SHARED_CONFIG} />

      <h2 id="tools">Tools</h2>
      <div className="doc-table">
        <table>
          <thead>
            <tr>
              <th>Tool</th>
              <th>What it does</th>
              <th>Calls the API</th>
            </tr>
          </thead>
          <tbody>
            {TOOLS.map(([name, what, network]) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                </td>
                <td>{what}</td>
                <td>{network}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        The plans follow the same rules as the rest of these docs: the key stays on your server, garment images come
        from your own catalogue, shoppers tick a consent box before a photo is sent, and results are captioned as
        AI-generated. See <Link href="/docs/api/nextjs">Next.js</Link> and{" "}
        <Link href="/docs/api/custom-store">Add try-on to a custom store</Link> for the same steps written out by hand.
      </p>

      <h2 id="resources">Resources and prompt</h2>
      <ul>
        <li>
          <b>Resources.</b> Each docs section is also available to read directly as{" "}
          <code>clothsy://docs/&lt;topic&gt;</code>, for example <code>clothsy://docs/errors</code>. Clients that let you
          attach resources to a chat can pull these in as context.
        </li>
        <li>
          <b>Prompt.</b> <code>add_clothsy_tryon</code> takes an optional <code>stack</code> and gives the agent the
          whole job in one go: detect the stack, get the plan, implement it, keep the key server-side, and finish with{" "}
          <code>clothsy_check_setup</code>. In Claude Code it appears as a slash command.
        </li>
      </ul>

      <h2 id="example">Example</h2>
      <p>A typical session in a Next.js project looks like this:</p>
      <Code title="Conversation" code={CONVERSATION} />
      <p>
        The agent adapts the plan to your code: it finds how your product pages load products and uses that in{" "}
        <code>resolveProduct</code>, rather than trusting anything the browser sends.
      </p>

      <h2 id="security">Security</h2>
      <ul>
        <li>
          <b>The key lives only in the environment.</b> The server reads <code>CLOTHSY_API_KEY</code> from its own
          environment. No tool accepts a key as an argument, so you never paste it into a chat, and output shows at most
          the <code>clothsy_live_</code> prefix.
        </li>
        <li>
          <b>Keep keys out of git.</b> Put real keys in user-level config (such as <code>~/.cursor/mcp.json</code>), use
          your client&apos;s input variables, or reference a shell variable as in the shared config above.
        </li>
        <li>
          <b>Spending needs a yes.</b> <code>clothsy_test_tryon</code> uses one credit when it succeeds and does nothing
          unless called with <code>confirmSpend: true</code>. Good agents ask you first. Use a photo of a consenting
          adult, such as yourself.
        </li>
        <li>
          <b>Nothing else leaves your machine.</b> Apart from those two tools, everything is answered locally from
          content bundled in the package.
        </li>
        <li>
          <b>Your store has its own key setting.</b> The key in your MCP config is only for the agent&apos;s checks. Your
          store&apos;s server still needs <code>CLOTHSY_API_KEY</code> in its own environment, such as{" "}
          <code>.env.local</code> or your host&apos;s secret settings.
        </li>
      </ul>

      <Pager current="/docs/api/mcp" />
    </>
  );
}

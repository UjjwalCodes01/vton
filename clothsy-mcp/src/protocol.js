// A small, dependency-free Model Context Protocol server: JSON-RPC 2.0 over
// newline-delimited stdio. stdout carries protocol messages only; every log
// line goes to stderr.

export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

export const ErrorCode = Object.freeze({
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
});

/** An error that becomes a JSON-RPC error response. */
export class RpcError extends Error {
  /**
   * @param {number} code
   * @param {string} message
   * @param {unknown} [data]
   */
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

/**
 * @typedef {{ type: "text", text: string }} TextContent
 * @typedef {{ content: TextContent[], isError?: boolean }} ToolResult
 * @typedef {{ signal: AbortSignal, env: Record<string, string | undefined> }} ToolContext
 * @typedef {{
 *   name: string,
 *   title?: string,
 *   description: string,
 *   inputSchema: Record<string, unknown>,
 *   annotations?: Record<string, unknown>,
 *   handler: (args: Record<string, any>, ctx: ToolContext) => Promise<ToolResult> | ToolResult,
 * }} Tool
 * @typedef {{ uri: string, name: string, title?: string, description?: string, mimeType: string, read: () => string }} Resource
 * @typedef {{ name: string, description?: string, required?: boolean }} PromptArgument
 * @typedef {{
 *   name: string,
 *   title?: string,
 *   description?: string,
 *   arguments?: PromptArgument[],
 *   get: (args: Record<string, string>) => { description?: string, messages: unknown[] },
 * }} Prompt
 * @typedef {{
 *   name: string,
 *   version: string,
 *   instructions?: string,
 *   tools?: Tool[],
 *   resources?: Resource[],
 *   prompts?: Prompt[],
 *   env?: Record<string, string | undefined>,
 *   log?: (message: string) => void,
 * }} ServerOptions
 */

/**
 * Create a transport-independent MCP server. `handle` takes one parsed JSON-RPC
 * message and resolves to the response object, or `null` for notifications.
 * @param {ServerOptions} options
 */
export function createServer(options) {
  const tools = new Map((options.tools ?? []).map((tool) => [tool.name, tool]));
  const resources = new Map((options.resources ?? []).map((res) => [res.uri, res]));
  const prompts = new Map((options.prompts ?? []).map((prompt) => [prompt.name, prompt]));
  const env = options.env ?? process.env;
  const log = options.log ?? (() => {});
  /** @type {Map<string | number, AbortController>} */
  const inflight = new Map();
  let shuttingDown = false;

  /** @type {Record<string, (params: any, id: string | number) => unknown>} */
  const methods = {
    initialize(params) {
      const requested = params?.protocolVersion;
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : LATEST_PROTOCOL_VERSION;
      const client = params?.clientInfo?.name ? `${params.clientInfo.name} ${params.clientInfo.version ?? ""}`.trim() : "unknown client";
      log(`initialize from ${client} (protocol ${requested ?? "unspecified"} -> ${protocolVersion})`);
      /** @type {Record<string, unknown>} */
      const result = {
        protocolVersion,
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: options.name, version: options.version },
      };
      if (options.instructions) result.instructions = options.instructions;
      return result;
    },

    ping() {
      return {};
    },

    "tools/list"() {
      return {
        tools: [...tools.values()].map(({ name, title, description, inputSchema, annotations }) => {
          /** @type {Record<string, unknown>} */
          const entry = { name, description, inputSchema };
          if (title) entry.title = title;
          if (annotations) entry.annotations = annotations;
          return entry;
        }),
      };
    },

    async "tools/call"(params, id) {
      const name = params?.name;
      if (typeof name !== "string") throw new RpcError(ErrorCode.INVALID_PARAMS, "tools/call needs a string `name`.");
      const tool = tools.get(name);
      if (!tool) {
        throw new RpcError(ErrorCode.INVALID_PARAMS, `Unknown tool: ${name}. Available: ${[...tools.keys()].join(", ")}.`);
      }
      const args = params.arguments ?? {};
      if (typeof args !== "object" || Array.isArray(args) || args === null) {
        return errorResult("`arguments` must be an object.");
      }
      const problems = validate(tool.inputSchema, args);
      if (problems.length) {
        return errorResult(`Invalid arguments for ${name}:\n${problems.map((p) => `- ${p}`).join("\n")}`);
      }
      const controller = new AbortController();
      inflight.set(id, controller);
      try {
        const result = await tool.handler(args, { signal: controller.signal, env });
        return result;
      } catch (error) {
        log(`tool ${name} threw: ${error instanceof Error ? error.stack : String(error)}`);
        return errorResult(`${name} failed unexpectedly: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        inflight.delete(id);
      }
    },

    "resources/list"() {
      return {
        resources: [...resources.values()].map(({ uri, name, title, description, mimeType }) => {
          /** @type {Record<string, unknown>} */
          const entry = { uri, name, mimeType };
          if (title) entry.title = title;
          if (description) entry.description = description;
          return entry;
        }),
      };
    },

    "resources/templates/list"() {
      return { resourceTemplates: [] };
    },

    "resources/read"(params) {
      const uri = params?.uri;
      const resource = typeof uri === "string" ? resources.get(uri) : undefined;
      if (!resource) {
        // -32002 is the MCP convention for "resource not found".
        throw new RpcError(-32002, `Resource not found: ${String(uri)}`, { uri });
      }
      return { contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: resource.read() }] };
    },

    "prompts/list"() {
      return {
        prompts: [...prompts.values()].map(({ name, title, description, arguments: args }) => {
          /** @type {Record<string, unknown>} */
          const entry = { name };
          if (title) entry.title = title;
          if (description) entry.description = description;
          if (args) entry.arguments = args;
          return entry;
        }),
      };
    },

    "prompts/get"(params) {
      const name = params?.name;
      const prompt = typeof name === "string" ? prompts.get(name) : undefined;
      if (!prompt) throw new RpcError(ErrorCode.INVALID_PARAMS, `Unknown prompt: ${String(name)}`);
      const args = params.arguments ?? {};
      for (const arg of prompt.arguments ?? []) {
        if (arg.required && (args[arg.name] === undefined || args[arg.name] === "")) {
          throw new RpcError(ErrorCode.INVALID_PARAMS, `Prompt ${name} needs the argument \`${arg.name}\`.`);
        }
      }
      return prompt.get(args);
    },

    // Some clients ask for these even though the capability isn't declared.
    "logging/setLevel"() {
      return {};
    },
    "completion/complete"() {
      return { completion: { values: [], hasMore: false } };
    },
  };

  /** @type {Record<string, (params: any) => void>} */
  const notifications = {
    "notifications/initialized"() {},
    "notifications/cancelled"(params) {
      inflight.get(params?.requestId)?.abort(new Error("Cancelled by the client."));
    },
    "notifications/roots/list_changed"() {},
  };

  /**
   * @param {unknown} message
   * @returns {Promise<object | null>}
   */
  async function handleOne(message) {
    if (!isObject(message) || message.jsonrpc !== "2.0") {
      const id = isObject(message) && isValidId(message.id) ? message.id : null;
      return rpcError(id, ErrorCode.INVALID_REQUEST, "Invalid Request: expected a JSON-RPC 2.0 object.");
    }
    const hasId = "id" in message;
    const { id, method, params } = message;

    // A response to something we sent (we never send requests, but be tolerant).
    if (typeof method !== "string") {
      if (hasId && ("result" in message || "error" in message)) return null;
      return rpcError(isValidId(id) ? id : null, ErrorCode.INVALID_REQUEST, "Invalid Request: `method` must be a string.");
    }

    if (!hasId) {
      const notify = notifications[method];
      if (notify) {
        try {
          notify(params);
        } catch (error) {
          log(`notification ${method} failed: ${String(error)}`);
        }
      }
      return null; // Never reply to notifications, known or not.
    }

    if (!isValidId(id)) return rpcError(null, ErrorCode.INVALID_REQUEST, "Invalid Request: `id` must be a string or number.");
    if (params !== undefined && !isObject(params) && !Array.isArray(params)) {
      return rpcError(id, ErrorCode.INVALID_PARAMS, "`params` must be an object.");
    }

    const fn = Object.hasOwn(methods, method) ? methods[method] : undefined;
    if (!fn) return rpcError(id, ErrorCode.METHOD_NOT_FOUND, `Method not found: ${method}`);
    if (shuttingDown) return rpcError(id, ErrorCode.INTERNAL_ERROR, "Server is shutting down.");

    try {
      const result = await fn(params, id);
      return { jsonrpc: "2.0", id, result };
    } catch (error) {
      if (error instanceof RpcError) return rpcError(id, error.code, error.message, error.data);
      log(`${method} failed: ${error instanceof Error ? error.stack : String(error)}`);
      return rpcError(id, ErrorCode.INTERNAL_ERROR, "Internal error.");
    }
  }

  return {
    /**
     * Handle one parsed message, or a batch (array) of them.
     * @param {unknown} message
     * @returns {Promise<object | object[] | null>}
     */
    async handle(message) {
      if (Array.isArray(message)) {
        if (message.length === 0) return rpcError(null, ErrorCode.INVALID_REQUEST, "Invalid Request: empty batch.");
        const replies = (await Promise.all(message.map(handleOne))).filter(Boolean);
        return replies.length ? replies : null;
      }
      return handleOne(message);
    },

    /** Abort every running tool call; used when stdin closes. */
    abortAll() {
      shuttingDown = true;
      for (const controller of inflight.values()) controller.abort(new Error("Server shutting down."));
    },
  };
}

/**
 * Serve an MCP server over newline-delimited stdio.
 * @param {ReturnType<typeof createServer>} server
 * @param {{ input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream, log?: (message: string) => void }} [io]
 * @returns {Promise<void>} resolves once input has ended and every pending reply was written
 */
export function serveStdio(server, io = {}) {
  const input = io.input ?? process.stdin;
  const output = io.output ?? process.stdout;
  const log = io.log ?? (() => {});
  /** @type {Set<Promise<void>>} */
  const pending = new Set();
  let buffer = "";
  let outputOpen = true;

  output.on("error", (error) => {
    outputOpen = false;
    log(`stdout closed: ${String(error)}`);
  });

  /** @param {unknown} message */
  function send(message) {
    if (!outputOpen) return;
    output.write(`${JSON.stringify(message)}\n`);
  }

  /** @param {string} line */
  function processLine(line) {
    const text = line.trim();
    if (!text) return;
    let message;
    try {
      message = JSON.parse(text);
    } catch {
      send(rpcError(null, ErrorCode.PARSE_ERROR, "Parse error: each line must be one JSON-RPC message."));
      return;
    }
    const task = server
      .handle(message)
      .then((reply) => {
        if (reply) send(reply);
      })
      .catch((error) => log(`unhandled: ${String(error)}`))
      .finally(() => pending.delete(task));
    pending.add(task);
  }

  if (typeof input.setEncoding === "function") input.setEncoding("utf8");

  return new Promise((resolve) => {
    input.on("data", (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        processLine(line);
      }
    });
    input.on("end", async () => {
      if (buffer.trim()) processLine(buffer);
      buffer = "";
      // The client has gone: stop long-running calls and let replies settle.
      server.abortAll();
      await Promise.allSettled([...pending]);
      resolve();
    });
  });
}

/**
 * @param {string} text
 * @returns {ToolResult}
 */
export function textResult(text) {
  return { content: [{ type: "text", text }] };
}

/**
 * @param {string} text
 * @returns {ToolResult}
 */
export function errorResult(text) {
  return { content: [{ type: "text", text }], isError: true };
}

/**
 * @param {string | number | null} id
 * @param {number} code
 * @param {string} message
 * @param {unknown} [data]
 */
function rpcError(id, code, message, data) {
  /** @type {{ code: number, message: string, data?: unknown }} */
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: "2.0", id, error };
}

/** @param {unknown} value @returns {value is Record<string, any>} */
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @param {unknown} id */
function isValidId(id) {
  return typeof id === "string" || (typeof id === "number" && Number.isFinite(id));
}

/**
 * Validate a value against the subset of JSON Schema the tools use:
 * type, properties, required, additionalProperties: false, enum, minLength,
 * maxLength, pattern. Returns a list of human-readable problems.
 * @param {Record<string, any>} schema
 * @param {unknown} value
 * @param {string} [path]
 * @returns {string[]}
 */
export function validate(schema, value, path = "arguments") {
  /** @type {string[]} */
  const problems = [];
  const type = schema.type;
  if (type === "object") {
    if (!isObject(value)) return [`${path} must be an object.`];
    const props = schema.properties ?? {};
    for (const key of schema.required ?? []) {
      if (value[key] === undefined) problems.push(`\`${key}\` is required.`);
    }
    for (const [key, v] of Object.entries(value)) {
      if (props[key]) problems.push(...validate(props[key], v, `\`${key}\``));
      else if (schema.additionalProperties === false) {
        problems.push(`Unknown argument \`${key}\`. Allowed: ${Object.keys(props).join(", ") || "none"}.`);
      }
    }
    return problems;
  }
  if (type === "string") {
    if (typeof value !== "string") return [`${path} must be a string.`];
    if (schema.enum && !schema.enum.includes(value)) return [`${path} must be one of: ${schema.enum.join(", ")}.`];
    if (schema.minLength !== undefined && value.length < schema.minLength) problems.push(`${path} is too short.`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      problems.push(`${path} must be at most ${schema.maxLength} characters.`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) problems.push(`${path} has the wrong format.`);
    return problems;
  }
  if (type === "boolean" && typeof value !== "boolean") return [`${path} must be true or false.`];
  if ((type === "number" || type === "integer") && (typeof value !== "number" || !Number.isFinite(value))) {
    return [`${path} must be a number.`];
  }
  if (type === "integer" && !Number.isInteger(value)) return [`${path} must be a whole number.`];
  return problems;
}

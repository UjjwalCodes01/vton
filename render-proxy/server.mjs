// Forwards everything that still arrives at fabricvton-api.onrender.com to the
// backend on AWS (api.clothsyai.fabricvton.com).
//
// The onrender.com name belongs to Render and is baked into released WooCommerce
// plugins, SDK versions and older links, so after the move the Render service
// runs this instead of the backend: requests and responses pass through
// unchanged (bodies streamed, up to the backend's own limits), only the Host
// header changes — plus, when FORWARDER_SECRET is set (the same value as the
// backend's), the caller's address and that secret, so the backend can tell
// shoppers apart instead of seeing every request come from Render. No
// dependencies.
import http from "node:http";
import https from "node:https";

const target = new URL(process.env.FORWARD_TO || "https://api.clothsyai.fabricvton.com");
const port = Number(process.env.PORT || 10000);
// Connection-level headers belong to each hop, not to the request.
const hopByHop = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade", "host",
]);
// Our own headers are never taken from the caller.
const ours = new Set(["x-clothsy-forwarder", "x-clothsy-client-ip"]);
const pass = (headers) => Object.fromEntries(Object.entries(headers).filter(([name]) => !hopByHop.has(name) && !ours.has(name)));
const secret = process.env.FORWARDER_SECRET || "";
// Render's edge (Cloudflare) overwrites CF-Connecting-IP with the address that
// connected, so it can't be forged by the caller.
const clientIp = (req) => String(req.headers["cf-connecting-ip"] || req.socket.remoteAddress || "").trim();
const identify = (req) => (secret ? { "x-clothsy-forwarder": secret, "x-clothsy-client-ip": clientIp(req) } : {});

http.createServer((req, res) => {
  const upstream = https.request(
    {
      hostname: target.hostname,
      port: target.port || 443,
      method: req.method,
      path: req.url,
      headers: { ...pass(req.headers), ...identify(req), host: target.host },
      // /api/v1/tryons/sync holds a request for up to 45 s.
      timeout: 120_000,
    },
    (reply) => {
      res.writeHead(reply.statusCode || 502, pass(reply.headers));
      reply.pipe(res);
    },
  );
  upstream.on("timeout", () => upstream.destroy(new Error("upstream timed out")));
  upstream.on("error", (error) => {
    console.error(`[forward] ${req.method} ${req.url.split("?")[0]}: ${error.message}`);
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
    res.end("Bad gateway");
  });
  req.pipe(upstream);
}).listen(port, () => console.log(`[forward] :${port} -> ${target.origin}`));

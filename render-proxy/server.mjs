// Forwards everything that still arrives at fabricvton-api.onrender.com to the
// backend on AWS (api.clothsyai.fabricvton.com).
//
// The onrender.com name belongs to Render and is baked into released WooCommerce
// plugins, SDK versions and older links, so after the move the Render service
// runs this instead of the backend: requests and responses pass through
// unchanged (bodies streamed, up to the backend's own limits), only the Host
// header changes. No dependencies.
import http from "node:http";
import https from "node:https";

const target = new URL(process.env.FORWARD_TO || "https://api.clothsyai.fabricvton.com");
const port = Number(process.env.PORT || 10000);
// Connection-level headers belong to each hop, not to the request.
const hopByHop = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade", "host",
]);
const pass = (headers) => Object.fromEntries(Object.entries(headers).filter(([name]) => !hopByHop.has(name)));

http.createServer((req, res) => {
  const upstream = https.request(
    {
      hostname: target.hostname,
      port: target.port || 443,
      method: req.method,
      path: req.url,
      headers: { ...pass(req.headers), host: target.host },
      // /api/v1/tryons/sync holds a request for up to 55 s.
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

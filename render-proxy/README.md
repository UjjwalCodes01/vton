# Render forwarder

After the backend moved to AWS, the Render service behind `fabricvton-api.onrender.com`
runs this instead: it passes every request to `https://api.clothsyai.fabricvton.com`
unchanged (only `Host` changes), so released WooCommerce plugins, SDK versions and old
links keep working. Override the target with `FORWARD_TO`.

Render settings for the existing service (Settings → Build & Deploy):

- Docker runtime: Root Directory `render-proxy`, Dockerfile Path `./Dockerfile`, no Docker Command.
- Node runtime: Root Directory `render-proxy`, Build Command `true`, Start Command `node server.mjs`.
- Clear any Pre-Deploy Command (the old one ran database migrations). The health check path can stay `/healthz`: it is forwarded to the backend.

The backend sees Render's address as the client for forwarded requests, so per-IP
limits apply to all of them together; per-key and per-store limits are unaffected.

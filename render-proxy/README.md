# Render forwarder

After the backend moved to AWS, the Render service behind `fabricvton-api.onrender.com`
runs this instead: it passes every request to `https://api.clothsyai.fabricvton.com`
unchanged (only `Host` changes), so released WooCommerce plugins, SDK versions and old
links keep working. Override the target with `FORWARD_TO`.

Render settings for the existing service (Settings → Build & Deploy):

- Docker runtime: Root Directory `render-proxy`, Dockerfile Path `./Dockerfile`, no Docker Command.
- Node runtime: Root Directory `render-proxy`, Build Command `true`, Start Command `node server.mjs`.
- Clear any Pre-Deploy Command (the old one ran database migrations). The health check path can stay `/healthz`: it is forwarded to the backend.

Set `FORWARDER_SECRET` on the Render service and the same value in the backend's secret
(`clothsy/prod/api`, via `infra/scripts/put-app-secret.sh`); generate it with
`openssl rand -hex 32`. The forwarder then sends each caller's address with that secret,
and the backend applies its per-IP limits to the real shopper. Without it the backend
sees Render's address for every forwarded request, so per-IP limits (30 try-ons an hour
by default) apply to all of them together.

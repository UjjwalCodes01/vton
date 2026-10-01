// Container entry point on AWS (ECS). ECS injects the admin secret as one JSON
// string (APP_SECRETS_JSON); its keys become ordinary environment variables
// (variables already set win), then the Next.js standalone server starts.
const raw = process.env.APP_SECRETS_JSON;
delete process.env.APP_SECRETS_JSON;
if (raw) {
  for (const [key, value] of Object.entries(JSON.parse(raw))) {
    if (process.env[key] === undefined && value !== null) process.env[key] = String(value);
  }
}
await import("./server.js");

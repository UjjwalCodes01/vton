// Container entry point on AWS (ECS). ECS injects this service's Secrets Manager
// secret as one JSON string (APP_SECRETS_JSON); its keys become ordinary
// environment variables, so the secret can hold exactly the keys the app uses
// without the task definition listing them. Variables already set (by the task
// definition) win. Then the normal server starts, with signals passed through
// so ECS can stop tasks gracefully.
import { spawn } from "node:child_process";

const raw = process.env.APP_SECRETS_JSON;
delete process.env.APP_SECRETS_JSON;
if (raw) {
  for (const [key, value] of Object.entries(JSON.parse(raw))) {
    if (process.env[key] === undefined && value !== null) process.env[key] = String(value);
  }
}

const child = spawn("node_modules/.bin/react-router-serve", ["./build/server/index.js"], { stdio: "inherit", env: process.env });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));

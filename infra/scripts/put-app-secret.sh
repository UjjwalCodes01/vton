#!/usr/bin/env bash
# Load an app's configuration from a local env file (KEY=VALUE lines, e.g. an
# export of the Render service's environment) into Secrets Manager:
#
#   infra/scripts/put-app-secret.sh <staging|prod> <api|admin> <path/to/file.env>
#
# Values are never printed, and the env file stays on your machine (do not
# commit it). Keys the task definition already sets (DATABASE_URL, the public
# URLs, storage and guard settings: see infra/env/services.tf) are dropped from
# the file, so the AWS values win. Tasks read the secret when they start, so
# running ones pick up the new values with a new deployment:
#   aws ecs update-service --cluster clothsy-<env> --service clothsy-<env>-<app> --force-new-deployment
# From PowerShell, run it with Git's bash ("bash" there is WSL, without AWS access):
#   & "C:\Program Files\Git\bin\bash.exe" infra/scripts/put-app-secret.sh prod api infra/env/prod-api.env
set -euo pipefail

ENV_NAME="${1:?env: staging or prod}"
APP="${2:?app: api or admin}"
FILE="${3:?path to the env file}"
case "$ENV_NAME" in staging|prod) ;; *) echo "env must be staging or prod" >&2; exit 1 ;; esac
case "$APP" in api|admin) ;; *) echo "app must be api or admin" >&2; exit 1 ;; esac
[ -f "$FILE" ] || { echo "no such file: $FILE" >&2; exit 1; }
# python3 on Linux/macOS; on Windows "python3" can be the Microsoft Store stub.
PY=python3; "$PY" -c '' 2>/dev/null || PY=python

JSON="$("$PY" - "$FILE" <<'EOF'
import json, sys
# Set by the task definition on AWS; values from Render would point at Render.
MANAGED = {"DATABASE_URL", "NODE_ENV", "PORT", "CLIENT_IP_HEADER", "PUBLIC_APP_URL", "SHOPIFY_APP_URL",
           "PORTAL_PUBLIC_BASE", "SHARE_PUBLIC_BASE", "SHARE_S3_ENDPOINT", "SHARE_S3_BUCKET", "SHARE_S3_REGION",
           "SHARE_S3_KEY_ID", "SHARE_S3_SECRET", "SAFETY_PROXY_BASE", "SAFETY_GUARD_MODE", "CLOTHSY_API_BASE"}
values = {}
# utf-8-sig: Notepad may start the file with a byte-order mark.
for line in open(sys.argv[1], encoding="utf-8-sig"):
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    key = key.strip().removeprefix("export ").strip()
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1]
    if key and key not in MANAGED:
        values[key] = value
print(json.dumps(values), end="")
EOF
)"

COUNT="$(printf '%s' "$JSON" | "$PY" -c 'import json,sys; print(len(json.load(sys.stdin)))')"
aws secretsmanager put-secret-value --region us-east-1 --secret-id "clothsy/$ENV_NAME/$APP" \
  --secret-string "$JSON" --query 'VersionId' --output text >/dev/null
echo "clothsy/$ENV_NAME/$APP updated with $COUNT keys (values not shown)."

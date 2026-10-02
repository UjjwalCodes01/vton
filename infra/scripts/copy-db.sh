#!/usr/bin/env bash
# Copy the live data from Neon (the database the Render backend uses) into an
# environment's Aurora cluster, without the rows that only matter for minutes:
#
#   infra/scripts/copy-db.sh <staging|prod> <path/to/file.env>
#
# The env file is the one loaded with put-app-secret.sh; only its DATABASE_URL
# is used. It is stored as the secret clothsy/<env>/source-db (never printed,
# never in a task definition) and read from there by a one-off task inside the
# VPC, since Aurora is not reachable from the internet. The task:
#   1. dumps Neon's public schema (the direct endpoint, not the pooler),
#   2. empties Aurora's public schema and restores the dump into it,
#   3. deletes rate-limit windows, Woo request nonces, expired Shopify sessions,
#      used or expired store link codes and expired shared looks,
#   4. prints the row count of every table, Neon's and Aurora's.
# Run it again at the cutover (with Render in maintenance) for the final copy.
# Afterwards: `deploy.sh <env> migrate` applies migrations newer than the copied
# data. Delete clothsy/<env>/source-db once the cutover is done.
set -euo pipefail
cd "$(dirname "$0")/../.."
# Git Bash would rewrite arguments like /ecs/... into Windows paths.
export MSYS_NO_PATHCONV=1

ENV_NAME="${1:?env: staging or prod}"
FILE="${2:?path to the env file with DATABASE_URL}"
case "$ENV_NAME" in staging|prod) ;; *) echo "env must be staging or prod" >&2; exit 1 ;; esac
[ -f "$FILE" ] || { echo "no such file: $FILE" >&2; exit 1; }
PY=python3; "$PY" -c '' 2>/dev/null || PY=python

# Everything in the target database is replaced, so say which one first.
if [ "${CONFIRM:-}" != "$ENV_NAME" ]; then
  echo "This REPLACES all data in the $ENV_NAME Aurora database with a copy of Neon."
  read -r -p "Type $ENV_NAME to continue: " answer
  [ "$answer" = "$ENV_NAME" ] || { echo "Not copying." >&2; exit 1; }
fi

REGION="${AWS_REGION:-us-east-1}"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
CLUSTER="clothsy-$ENV_NAME"
SOURCE_SECRET="clothsy/$ENV_NAME/source-db"
DB_SECRET="arn:aws:secretsmanager:$REGION:$ACCOUNT:secret:clothsy/$ENV_NAME/db"
LOG_GROUP="/ecs/clothsy-$ENV_NAME-api"

# DATABASE_URL from the file, on Neon's direct endpoint: pg_dump needs a real
# session, which Neon's pooler (PgBouncer in transaction mode) does not give.
SOURCE_JSON="$("$PY" - "$FILE" <<'EOF'
import json, sys
from urllib.parse import urlsplit, urlunsplit
url = ""
for line in open(sys.argv[1], encoding="utf-8-sig"):
    line = line.strip()
    if line.startswith("DATABASE_URL="):
        url = line.split("=", 1)[1].strip().strip("\"'")
if not url.startswith(("postgres://", "postgresql://")):
    sys.exit("DATABASE_URL missing or not a postgres URL")
parts = urlsplit(url)
userinfo, _, hostport = parts.netloc.rpartition("@")
host, colon, port = hostport.partition(":")
first, dot, rest = host.partition(".")
if first.endswith("-pooler"):
    host = first[: -len("-pooler")] + dot + rest
netloc = (userinfo + "@" if userinfo else "") + host + colon + port
print(json.dumps({"url": urlunsplit(parts._replace(netloc=netloc))}), end="")
EOF
)"

if aws secretsmanager describe-secret --region "$REGION" --secret-id "$SOURCE_SECRET" >/dev/null 2>&1; then
  aws secretsmanager put-secret-value --region "$REGION" --secret-id "$SOURCE_SECRET" --secret-string "$SOURCE_JSON" >/dev/null
else
  aws secretsmanager create-secret --region "$REGION" --name "$SOURCE_SECRET" \
    --description "Neon connection for the copy into Aurora; delete after the cutover" --secret-string "$SOURCE_JSON" >/dev/null
fi
SOURCE_ARN="$(aws secretsmanager describe-secret --region "$REGION" --secret-id "$SOURCE_SECRET" --query ARN --output text)"
unset SOURCE_JSON
echo "[copy] source stored in $SOURCE_SECRET"

# The script the task runs. Row counts only; no data reaches the logs.
read -r -d '' TASK_SCRIPT <<'EOF' || true
set -eu
counts() {
  psql "$@" -At -v ON_ERROR_STOP=1 -c "SELECT format('%s=%s', table_name, (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I', table_name), false, true, '')))[1]::text) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
}
echo "versions: neon $(psql "$SOURCE_URL" -Atc 'SHOW server_version') -> aurora $(psql -Atc 'SHOW server_version')"
counts "$SOURCE_URL" | sed 's/^/neon /'
pg_dump "$SOURCE_URL" --format=custom --no-owner --no-acl --schema=public --file=/tmp/db.dump
echo "dump: $(du -h /tmp/db.dump | cut -f1)"
psql -q -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public CASCADE' -c 'CREATE SCHEMA public'
# The public schema itself already exists on the target.
pg_restore -l /tmp/db.dump | grep -vE ' SCHEMA - public | COMMENT - SCHEMA public ' > /tmp/toc
pg_restore --no-owner --no-acl --exit-on-error --use-list=/tmp/toc --dbname="$PGDATABASE" /tmp/db.dump
psql -q -v ON_ERROR_STOP=1 <<'SQL'
DELETE FROM "RateLimitWindow";
DELETE FROM "WooRequestNonce";
DELETE FROM "Session" WHERE expires IS NOT NULL AND expires < now();
DELETE FROM "StoreLinkCode" WHERE "expiresAt" < now() OR "usedAt" IS NOT NULL;
DELETE FROM "SharedLook" WHERE "expiresAt" < now();
ANALYZE;
SQL
counts | sed 's/^/aurora /'
echo "copy complete"
EOF

# Same network as the backend: public subnets (the task reaches Neon over the
# internet) and the app security group (the only one Aurora accepts).
NETWORK="$(aws ecs describe-express-gateway-service --region "$REGION" \
  --service-arn "arn:aws:ecs:$REGION:$ACCOUNT:service/$CLUSTER/clothsy-$ENV_NAME-api" --output json \
  | "$PY" -c '
import json, sys
configs = json.load(sys.stdin)["service"]["activeConfigurations"]
n = max(configs, key=lambda c: c["createdAt"])["networkConfiguration"]
print(json.dumps({"awsvpcConfiguration": {"subnets": n["subnets"], "securityGroups": n["securityGroups"], "assignPublicIp": "ENABLED"}}), end="")')"

TASKDEF_JSON="$("$PY" - "$ENV_NAME" "$ACCOUNT" "$REGION" "$SOURCE_ARN" "$DB_SECRET" "$LOG_GROUP" "$TASK_SCRIPT" <<'EOF'
import json, sys
env, account, region, source_arn, db_secret, log_group, script = sys.argv[1:8]
print(json.dumps({
    "family": f"clothsy-{env}-db-copy",
    "executionRoleArn": f"arn:aws:iam::{account}:role/clothsy-{env}-task-execution",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "1024",
    "memory": "4096",
    "ephemeralStorage": {"sizeInGiB": 50},
    "containerDefinitions": [{
        "name": "copy",
        "image": "public.ecr.aws/docker/library/postgres:17-alpine",
        "essential": True,
        "entryPoint": ["sh", "-c"],
        "command": [script],
        "environment": [{"name": "PGPORT", "value": "5432"}, {"name": "PGSSLMODE", "value": "require"}],
        "secrets": [
            {"name": "SOURCE_URL", "valueFrom": f"{source_arn}:url::"},
            {"name": "PGHOST", "valueFrom": f"{db_secret}:host::"},
            {"name": "PGUSER", "valueFrom": f"{db_secret}:username::"},
            {"name": "PGPASSWORD", "valueFrom": f"{db_secret}:password::"},
            {"name": "PGDATABASE", "valueFrom": f"{db_secret}:dbname::"},
        ],
        "logConfiguration": {"logDriver": "awslogs", "options": {
            "awslogs-group": log_group, "awslogs-region": region, "awslogs-stream-prefix": "db-copy"}},
    }],
}), end="")
EOF
)"
TASKDEF="$(aws ecs register-task-definition --region "$REGION" --cli-input-json "$TASKDEF_JSON" \
  --query taskDefinition.taskDefinitionArn --output text)"

echo "[copy] running in $CLUSTER (several minutes for a large database)"
TASK="$(aws ecs run-task --region "$REGION" --cluster "$CLUSTER" --launch-type FARGATE --task-definition "$TASKDEF" \
  --network-configuration "$NETWORK" --query 'tasks[0].taskArn' --output text)"
until [ "$(aws ecs describe-tasks --region "$REGION" --cluster "$CLUSTER" --tasks "$TASK" --query 'tasks[0].lastStatus' --output text)" = STOPPED ]; do
  sleep 15
done
EXIT_CODE="$(aws ecs describe-tasks --region "$REGION" --cluster "$CLUSTER" --tasks "$TASK" \
  --query "tasks[0].containers[?name=='copy'].exitCode | [0]" --output text)"

aws logs get-log-events --region "$REGION" --log-group-name "$LOG_GROUP" \
  --log-stream-name "db-copy/copy/${TASK##*/}" --start-from-head --query 'events[].message' --output text | tr '\t' '\n'
if [ "$EXIT_CODE" != "0" ]; then
  echo "[copy] failed (exit $EXIT_CODE); Aurora may be partly restored, so run it again before using $ENV_NAME" >&2
  exit 1
fi
echo "[copy] done. Next: infra/scripts/deploy.sh $ENV_NAME migrate"

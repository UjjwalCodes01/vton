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
#   1. checks that Neon and Aurora have applied the same Prisma migrations
#      (run `deploy.sh <env> migrate` first, so Aurora has the app's schema),
#   2. dumps the data of the app's tables from Neon (the direct endpoint, not the
#      pooler); tables of anything else sharing that database are left behind,
#   3. empties those tables on Aurora and loads the data in one transaction,
#   4. deletes rate-limit windows, Woo request nonces, expired Shopify sessions,
#      used or expired store link codes and expired shared looks,
#   5. prints the row count of every copied table, Neon's and Aurora's.
# Run it again at the cutover (with Render in maintenance) for the final copy.
# Delete clothsy/<env>/source-db once the cutover is done.
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
q() { psql "$@" -At -v ON_ERROR_STOP=1; }
echo "versions: neon $(q "$SOURCE_URL" -c 'SHOW server_version') -> aurora $(q -c 'SHOW server_version')"

# The app's tables are the ones its migrations created on Aurora. Anything else
# in Neon (another app keeps its tables in the same database) stays behind.
LIST_TABLES="SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations' ORDER BY 1"
TABLES="$(q -c "$LIST_TABLES")"
[ -n "$TABLES" ] || { echo "Aurora has no tables yet: run deploy.sh <env> migrate first."; exit 1; }
echo "left in neon (not the app's): $(q "$SOURCE_URL" -c "$LIST_TABLES" | grep -vxF "$TABLES" | tr '\n' ' ')"

# The same migrations on both sides mean the same columns, so the data alone is
# copied into the schema Aurora already has (and Neon's newer PostgreSQL major
# version does not matter).
APPLIED="SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY 1"
q "$SOURCE_URL" -c "$APPLIED" > /tmp/neon-migrations
q -c "$APPLIED" > /tmp/aurora-migrations
if ! cmp -s /tmp/neon-migrations /tmp/aurora-migrations; then
  echo "migrations differ (< neon, > aurora):"; diff /tmp/neon-migrations /tmp/aurora-migrations || true
  echo "Not copying: bring both databases to the same migrations first."; exit 1
fi
echo "migrations: $(wc -l < /tmp/aurora-migrations) applied on both"

count_sql() { for t in $TABLES; do printf "SELECT '%s=' || count(*) FROM public.\"%s\";\n" "$t" "$t"; done; }
count_sql | q "$SOURCE_URL" | sed 's/^/neon /'

set --
for t in $TABLES; do set -- "$@" "--table=public.\"$t\""; done
pg_dump "$SOURCE_URL" --data-only --format=custom --no-owner --no-acl "$@" --file=/tmp/data.dump
echo "dump: $(du -h /tmp/data.dump | cut -f1)"
LIST="$(for t in $TABLES; do printf '"%s",' "$t"; done)"
q -c "TRUNCATE ${LIST%,} CASCADE" > /dev/null
pg_restore --data-only --no-owner --no-acl --exit-on-error --single-transaction --dbname="$PGDATABASE" /tmp/data.dump
psql -q -v ON_ERROR_STOP=1 <<'SQL'
DELETE FROM "RateLimitWindow";
DELETE FROM "WooRequestNonce";
DELETE FROM "Session" WHERE expires IS NOT NULL AND expires < now();
DELETE FROM "StoreLinkCode" WHERE "expiresAt" < now() OR "usedAt" IS NOT NULL;
DELETE FROM "SharedLook" WHERE "expiresAt" < now();
ANALYZE;
SQL
count_sql | q | sed 's/^/aurora /'
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
        # Client tools at least as new as Neon's server (pg_dump refuses older).
        "image": "public.ecr.aws/docker/library/postgres:18-alpine",
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
  echo "[copy] failed (exit $EXIT_CODE); see the lines above. If it got as far as loading, the app's tables on Aurora may be empty: run it again." >&2
  exit 1
fi
echo "[copy] done: compare the neon and aurora counts above (the cleaned tables are expected to be lower)."

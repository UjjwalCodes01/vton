#!/usr/bin/env bash
# Build, push and deploy the Clothsy apps to one environment on AWS.
#
#   infra/scripts/deploy.sh <staging|prod> [api portal admin newsite www]
#   infra/scripts/deploy.sh <staging|prod> migrate
#
# Used by .github/workflows/deploy-*.yml and runnable by hand with the same
# AWS permissions. For each app: build the image (build-time values come from
# the clothsy/<env>/build secret), push it to ECR tagged <env>-<commit>, and
# hand the new image to the app's ECS Express Mode service, which rolls it out
# as a canary and rolls back by itself if the new tasks do not become healthy.
# Before the backend rolls, its database migrations run once as a one-off task
# of the new image. Everything else about a service (environment, secrets,
# sizes, scaling) is Terraform's; this script only ever changes the image.
set -euo pipefail
cd "$(dirname "$0")/../.."

ENV_NAME="${1:?env: staging or prod}"; shift
case "$ENV_NAME" in staging|prod) ;; *) echo "env must be staging or prod" >&2; exit 1 ;; esac
APPS=("${@:-api portal admin newsite www}")
read -r -a APPS <<< "${APPS[*]}"

REGION="${AWS_REGION:-us-east-1}"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"
CLUSTER="clothsy-$ENV_NAME"
TAG="$ENV_NAME-$(git rev-parse --short=12 HEAD)"
# python3 on CI; on Windows "python3" can be the Microsoft Store stub.
PY=python3; "$PY" -c '' 2>/dev/null || PY=python

declare -A DIR=([api]=fabricvton [portal]=custom-store [admin]=admin-dashboard [newsite]=fabricvton-newsite [www]=fabricvton-nextjs)

BUILD_JSON="$(aws secretsmanager get-secret-value --region "$REGION" --secret-id "clothsy/$ENV_NAME/build" --query SecretString --output text)"
build_value() { printf '%s' "$BUILD_JSON" | "$PY" -c "import json,sys; print(json.load(sys.stdin).get('$1',''), end='')"; }

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null

image_of() { echo "$REGISTRY/clothsy/$1:$TAG"; }
service_name() { echo "clothsy-$ENV_NAME-$1"; }
service_arn() { echo "arn:aws:ecs:$REGION:$ACCOUNT:service/$CLUSTER/$(service_name "$1")"; }

build_and_push() {
  local app="$1" image args=()
  image="$(image_of "$app")"
  if aws ecr describe-images --region "$REGION" --repository-name "clothsy/$app" --image-ids imageTag="$TAG" >/dev/null 2>&1; then
    echo "[$app] $TAG already in ECR"; return
  fi
  case "$app" in
    portal)  args=(--build-arg "CLOTHSY_API_BASE=$(build_value API_PUBLIC_URL)" --build-arg "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$(build_value PORTAL_ACTIONS_KEY)") ;;
    admin)   args=(--build-arg "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$(build_value ADMIN_ACTIONS_KEY)") ;;
    newsite) args=(--build-arg "TRYON_API_ORIGIN=$(build_value API_PUBLIC_URL)") ;;
    www)     args=(--build-arg "NEXT_PUBLIC_GA_ID=$(build_value NEXT_PUBLIC_GA_ID)") ;;
  esac
  echo "[$app] building $image"
  docker build --platform linux/amd64 --provenance=false "${args[@]}" -t "$image" "${DIR[$app]}"
  docker push "$image" >/dev/null
}

# The newest active configuration of an app's Express service, as JSON.
active_config() {
  aws ecs describe-express-gateway-service --region "$REGION" --service-arn "$(service_arn "$1")" --output json \
  | "$PY" -c '
import json, sys
configs = json.load(sys.stdin)["service"]["activeConfigurations"]
print(json.dumps(max(configs, key=lambda c: c["createdAt"])))'
}

# Runs `prisma migrate deploy` once, as a one-off task of the new backend image
# with the service's own roles, secrets and network. The task definition gets
# its own family so the service's managed revisions are left alone.
run_migrations() {
  local image="$1" config definition taskdef network run task exit_code
  config="$(active_config api)"
  definition="$(aws ecs describe-task-definition --region "$REGION" \
    --task-definition "$(printf '%s' "$config" | "$PY" -c 'import json,sys; print(json.load(sys.stdin)["taskDefinitionArn"], end="")')" \
    --query taskDefinition --output json \
  | "$PY" -c '
import json, sys
td = json.load(sys.stdin)
td["family"] = sys.argv[2]
for c in td["containerDefinitions"]:
    c["image"] = sys.argv[1]
keep = ["family", "taskRoleArn", "executionRoleArn", "networkMode", "containerDefinitions", "volumes",
        "requiresCompatibilities", "cpu", "memory", "runtimePlatform"]
print(json.dumps({k: td[k] for k in keep if k in td}))' "$image" "$(service_name api)-migrate")"
  taskdef="$(aws ecs register-task-definition --region "$REGION" --cli-input-json "$definition" \
    --query taskDefinition.taskDefinitionArn --output text)"
  # Public subnets without a NAT: the task needs a public address to reach ECR and Secrets Manager.
  network="$(printf '%s' "$config" | "$PY" -c '
import json, sys
n = json.load(sys.stdin)["networkConfiguration"]
print(json.dumps({"awsvpcConfiguration": {"subnets": n["subnets"], "securityGroups": n["securityGroups"], "assignPublicIp": "ENABLED"}}))')"
  echo "[api] running prisma migrate deploy"
  run="$(aws ecs run-task --region "$REGION" --cluster "$CLUSTER" --launch-type FARGATE --task-definition "$taskdef" \
    --network-configuration "$network" \
    --overrides '{"containerOverrides":[{"name":"Main","command":["node_modules/.bin/prisma","migrate","deploy"]}]}' \
    --output json)"
  task="$(printf '%s' "$run" | "$PY" -c 'import json,sys; t=json.load(sys.stdin).get("tasks") or []; print(t[0]["taskArn"] if t else "", end="")')"
  if [ -z "$task" ]; then
    echo "[api] the migration task did not start: $(printf '%s' "$run" | "$PY" -c 'import json,sys; print(json.load(sys.stdin).get("failures"), end="")')" >&2
    exit 1
  fi
  aws ecs wait tasks-stopped --region "$REGION" --cluster "$CLUSTER" --tasks "$task"
  exit_code="$(aws ecs describe-tasks --region "$REGION" --cluster "$CLUSTER" --tasks "$task" \
    --query "tasks[0].containers[?name=='Main'].exitCode | [0]" --output text)"
  if [ "$exit_code" != "0" ]; then
    echo "[api] migrations failed (exit $exit_code); see /ecs/$(service_name api) in CloudWatch. Not deploying." >&2
    exit 1
  fi
}

# Gives the service the new image; the rest of its container settings stay as they are.
roll() {
  local app="$1" image="$2" container
  container="$(active_config "$app" | "$PY" -c '
import json, sys
container = json.load(sys.stdin)["primaryContainer"]
container["image"] = sys.argv[1]
print(json.dumps({k: v for k, v in container.items() if v not in (None, [], {})}))' "$image")"
  aws ecs update-express-gateway-service --region "$REGION" --service-arn "$(service_arn "$app")" \
    --primary-container "$container" --query service.serviceName --output text >/dev/null
  echo "[$app] rolling to $TAG"
}

# Waits for the deployment started after $2 to finish; fails if it was rolled back.
wait_rolled() {
  local app="$1" since="$2" deployment="" status="" deadline=$((SECONDS + 1800))
  while [ -z "$deployment" ] || [ "$deployment" = "None" ]; do
    [ "$SECONDS" -gt "$deadline" ] && { echo "[$app] no deployment started" >&2; return 1; }
    sleep 5
    deployment="$(aws ecs list-service-deployments --region "$REGION" --cluster "$CLUSTER" --service "$(service_name "$app")" \
      --created-at "after=$since" --query 'serviceDeployments[0].serviceDeploymentArn' --output text)"
  done
  while :; do
    status="$(aws ecs describe-service-deployments --region "$REGION" --service-deployment-arns "$deployment" \
      --query 'serviceDeployments[0].status' --output text)"
    case "$status" in
      SUCCESSFUL) echo "[$app] live on $TAG"; return 0 ;;
      PENDING|IN_PROGRESS|ROLLBACK_REQUESTED|ROLLBACK_IN_PROGRESS|STOP_REQUESTED) ;;
      *) echo "[$app] deployment ended $status (rolled back to the previous image); see /ecs/$(service_name "$app")" >&2; return 1 ;;
    esac
    [ "$SECONDS" -gt "$deadline" ] && { echo "[$app] still $status after 30 minutes" >&2; return 1; }
    sleep 15
  done
}

# `deploy.sh <env> migrate`: only the backend image and its migrations, nothing
# rolls (a new environment, or the database cutover before the services start).
if [ "${APPS[*]}" = migrate ]; then
  build_and_push api
  run_migrations "$(image_of api)"
  echo "Migrated $ENV_NAME with $TAG"
  exit 0
fi

for app in "${APPS[@]}"; do build_and_push "$app"; done

# The backend goes first (with its migrations) so the frontends never call an older API.
ORDERED=()
for app in "${APPS[@]}"; do [ "$app" = api ] && ORDERED=(api "${ORDERED[@]}") || ORDERED+=("$app"); done

declare -A STARTED=()
failed=0
for app in "${ORDERED[@]}"; do
  [ "$app" = api ] && run_migrations "$(image_of api)"
  since="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  roll "$app" "$(image_of "$app")"
  if [ "$app" = api ]; then wait_rolled api "$since" || exit 1; else STARTED[$app]="$since"; fi
done
for app in "${ORDERED[@]}"; do
  [ "$app" = api ] && continue
  wait_rolled "$app" "${STARTED[$app]}" || failed=1
done
[ "$failed" = 0 ] || exit 1
echo "Deployed $TAG to $ENV_NAME: ${ORDERED[*]}"

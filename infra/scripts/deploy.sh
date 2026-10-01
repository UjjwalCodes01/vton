#!/usr/bin/env bash
# Build, push and deploy the Clothsy apps to one environment on AWS.
#
#   infra/scripts/deploy.sh <staging|prod> [api portal admin newsite www]
#
# Used by .github/workflows/deploy-*.yml and runnable by hand with the same
# AWS permissions. For each app: build the image (build-time values come from
# the clothsy/<env>/build secret), push it to ECR tagged <env>-<commit>, register
# a task definition revision with that image, and roll the ECS service (the
# circuit breaker rolls back a deployment whose tasks do not become healthy).
# Before the backend rolls, its database migrations run once as a one-off task.
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

declare -A DIR=([api]=fabricvton [portal]=custom-store [admin]=admin-dashboard [newsite]=fabricvton-newsite [www]=fabricvton-nextjs)

BUILD_JSON="$(aws secretsmanager get-secret-value --region "$REGION" --secret-id "clothsy/$ENV_NAME/build" --query SecretString --output text)"
build_value() { printf '%s' "$BUILD_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin).get('$1',''))"; }

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null

build_and_push() {
  local app="$1" image="$REGISTRY/clothsy/$1:$TAG" args=()
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

# Registers a revision of the app's task definition with the new image; prints its ARN.
register_revision() {
  local app="$1" family="clothsy-$ENV_NAME-$1"
  aws ecs describe-task-definition --region "$REGION" --task-definition "$family" --query taskDefinition --output json \
  | python3 -c '
import json, sys
td = json.load(sys.stdin)
for c in td["containerDefinitions"]:
    c["image"] = sys.argv[1]
keep = ["family", "taskRoleArn", "executionRoleArn", "networkMode", "containerDefinitions", "volumes",
        "requiresCompatibilities", "cpu", "memory", "runtimePlatform"]
print(json.dumps({k: td[k] for k in keep if k in td}))' "$REGISTRY/clothsy/$app:$TAG" > /tmp/clothsy-taskdef.json
  aws ecs register-task-definition --region "$REGION" --cli-input-json file:///tmp/clothsy-taskdef.json \
    --query taskDefinition.taskDefinitionArn --output text
}

run_migrations() {
  local taskdef="$1" network task exit_code
  network="$(aws ecs describe-services --region "$REGION" --cluster "$CLUSTER" --services api \
    --query 'services[0].networkConfiguration' --output json)"
  echo "[api] running prisma migrate deploy"
  task="$(aws ecs run-task --region "$REGION" --cluster "$CLUSTER" --launch-type FARGATE --task-definition "$taskdef" \
    --network-configuration "$network" \
    --overrides '{"containerOverrides":[{"name":"api","command":["npx","prisma","migrate","deploy"]}]}' \
    --query 'tasks[0].taskArn' --output text)"
  aws ecs wait tasks-stopped --region "$REGION" --cluster "$CLUSTER" --tasks "$task"
  exit_code="$(aws ecs describe-tasks --region "$REGION" --cluster "$CLUSTER" --tasks "$task" \
    --query 'tasks[0].containers[0].exitCode' --output text)"
  if [ "$exit_code" != "0" ]; then
    echo "[api] migrations failed (exit $exit_code); see /ecs/clothsy-$ENV_NAME-api in CloudWatch. Not deploying." >&2
    exit 1
  fi
}

for app in "${APPS[@]}"; do build_and_push "$app"; done

for app in "${APPS[@]}"; do
  taskdef="$(register_revision "$app")"
  [ "$app" = api ] && run_migrations "$taskdef"
  aws ecs update-service --region "$REGION" --cluster "$CLUSTER" --service "$app" --task-definition "$taskdef" \
    --query 'service.serviceName' --output text >/dev/null
  echo "[$app] rolling to $TAG"
done

aws ecs wait services-stable --region "$REGION" --cluster "$CLUSTER" --services "${APPS[@]}"
echo "Deployed $TAG to $ENV_NAME: ${APPS[*]}"

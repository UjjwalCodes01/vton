#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

command -v node >/dev/null || { echo "node is required" >&2; exit 1; }
command -v npm >/dev/null || { echo "npm is required" >&2; exit 1; }
command -v terraform >/dev/null || { echo "terraform is required" >&2; exit 1; }

echo "[1/4] Installing dependencies"
npm install --no-audit --no-fund

echo "[2/4] Type-checking and bundling Lambda code into build/lambda"
npm run build

echo "[3/4] Terraform init"
terraform -chdir=terraform init

# Terraform zips build/lambda itself (archive_file), so the first apply already
# deploys real code and later applies redeploy whenever the bundle changes.
echo "[4/4] Terraform apply"
terraform -chdir=terraform apply -auto-approve

echo
echo "Deployment complete."
echo "API endpoint: $(terraform -chdir=terraform output -raw api_url)/v1/request"

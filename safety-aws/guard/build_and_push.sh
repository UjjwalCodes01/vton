#!/usr/bin/env bash
# Build the clothsy-guard image (MiVOLO exported and verified during the build;
# context is safety-aws/ so it reuses age/) and push it to ECR. Prints the image
# URI for Terraform:  terraform apply -var guard_image_uri=<printed URI>
set -euo pipefail
cd "$(dirname "$0")/.."

REGION="${AWS_REGION:-us-east-1}"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"
REPO="$REGISTRY/clothsy-guard"
TAG="$(git rev-parse --short HEAD 2>/dev/null || echo local)-$(date -u +%Y%m%d%H%M%S)"

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY" >&2
# Lambda needs a single-platform Docker manifest: no provenance attestation index.
docker build --platform linux/amd64 --provenance=false -f guard/Dockerfile -t "$REPO:$TAG" . >&2
docker push "$REPO:$TAG" >&2
DIGEST="$(aws ecr describe-images --region "$REGION" --repository-name clothsy-guard \
  --image-ids imageTag="$TAG" --query 'imageDetails[0].imageDigest' --output text)"
echo "$REPO@$DIGEST"

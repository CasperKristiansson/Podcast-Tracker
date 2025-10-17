#!/usr/bin/env bash
set -euo pipefail

# Deploys the Astro web app by building, uploading to S3, and invalidating CloudFront.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

EDGE_STACK_NAME=${EDGE_STACK_NAME:-PodcastTrackerEdgeStack}
EDGE_STACK_REGION=${EDGE_STACK_REGION:-eu-north-1}
: "${AWS_PROFILE:=Personal}"

aws_cli() {
  if [[ -n "${AWS_PROFILE:-}" ]]; then
    aws "$@" --profile "$AWS_PROFILE"
  else
    aws "$@"
  fi
}

echo "Building frontend (apps/web)..."
npm run --workspace apps/web build

echo "Resolving stack outputs from ${EDGE_STACK_NAME} in ${EDGE_STACK_REGION}..."
SITE_BUCKET=$(aws_cli cloudformation describe-stacks \
  --stack-name "${EDGE_STACK_NAME}" \
  --region "${EDGE_STACK_REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='SiteBucketName'].OutputValue" \
  --output text)

if [[ -z "${SITE_BUCKET}" || "${SITE_BUCKET}" == "None" ]]; then
  echo "Unable to resolve SiteBucketName output from ${EDGE_STACK_NAME}" >&2
  exit 1
fi

echo "Syncing build artifacts to s3://${SITE_BUCKET}/ ..."
aws_cli s3 sync apps/web/dist "s3://${SITE_BUCKET}/" \
  --delete

DISTRIBUTION_ID=$(aws_cli cloudformation describe-stacks \
  --stack-name "${EDGE_STACK_NAME}" \
  --region "${EDGE_STACK_REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
  --output text)

if [[ -z "${DISTRIBUTION_ID}" || "${DISTRIBUTION_ID}" == "None" ]]; then
  echo "Unable to resolve CloudFrontDistributionId output from ${EDGE_STACK_NAME}" >&2
  exit 1
fi

echo "Invalidating CloudFront distribution ${DISTRIBUTION_ID}..."
aws_cli cloudfront create-invalidation \
  --distribution-id "${DISTRIBUTION_ID}" \
  --paths "/*"

echo "Web deployment complete."

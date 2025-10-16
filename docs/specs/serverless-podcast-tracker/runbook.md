# Serverless Podcast Tracker — Operations Runbook

Use this runbook to operate the single-production environment. It covers environment preparation, regional CDK bootstrapping, repeatable infrastructure deployments, static web publishes, and manual rollback guidance. All commands assume the AWS CLI profile `Personal`, workload region `eu-north-1`, and certificate region `us-east-1`.

## 1. Prerequisites
- Node.js ≥ 24.10.0 and npm ≥ 11.6.0 (matches repository engines).
- AWS CLI v2 installed and configured with profile `Personal` that can manage CloudFormation, IAM, S3, Route 53, ACM, AppSync, DynamoDB, and EventBridge in the target account.
- Route 53 hosted zone `casperkristiansson.com` in the production account (needed for certificate validation and aliases).
- Google OAuth credentials (client ID / secret) provisioned for the production domain.
- Optional: `aws sso login --profile Personal` if the profile uses AWS SSO.

### 1.1 Required environment variables
Populate a local secrets file such as `.env.production` (never commit to Git). The `infra` CDK app loads it via `dotenv/config`. Required keys:
- `AWS_ACCOUNT_ID` — numeric AWS account identifier.
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`.
- `COGNITO_DOMAIN_PREFIX` — unique domain prefix (lowercase, 63 chars max).
- `COGNITO_CALLBACK_URLS`, `COGNITO_LOGOUT_URLS` — comma-separated HTTPS URLs.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

Before running CDK commands either `cp .env.production .env` or export the variables into the shell (`export $(grep -v '^#' .env.production | xargs)`).

## 2. Workspace setup
Run once per fresh clone or after dependency changes:

```bash
npm install
```

Optional identity confirmation:

```bash
aws sts get-caller-identity --profile Personal
```

Confirm the account matches `AWS_ACCOUNT_ID`.

## 3. One-time CDK bootstrap
The modern bootstrap template is required for all deployments (including GitHub OIDC).

### 3.1 Bootstrap `eu-north-1` (application region)
```bash
export CDK_NEW_BOOTSTRAP=1
npm run --workspace infra cdk bootstrap \
  aws://${AWS_ACCOUNT_ID}/eu-north-1 \
  --profile Personal
unset CDK_NEW_BOOTSTRAP
```

### 3.2 Bootstrap `us-east-1` (CloudFront certificate region)
```bash
export CDK_NEW_BOOTSTRAP=1
npm run --workspace infra cdk bootstrap \
  aws://${AWS_ACCOUNT_ID}/us-east-1 \
  --profile Personal
unset CDK_NEW_BOOTSTRAP
```

Verify bootstraps:

```bash
npm run --workspace infra cdk ls -- --profile Personal
```

Expected stack names: `PodcastTrackerCertificateStack`, `PodcastTrackerConfigStack`, `PodcastTrackerAuthStack`, `PodcastTrackerApiDataStack`, `PodcastTrackerEdgeStack`.

## 4. Manual infrastructure deployment

### 4.1 Pre-flight checks
- Ensure `.env` (or exported variables) contains the values listed above.
- Build the CDK app (optional but keeps `dist/` current):
  ```bash
  npm run --workspace infra build
  ```
- (Optional) review planned changes:
  ```bash
  npm run --workspace infra cdk:diff -- --profile Personal
  ```

### 4.2 Initial deployment order
Deploy individual stacks in sequence on a fresh environment to satisfy cross-region dependencies:

```bash
npm run --workspace infra cdk:deploy -- \
  --profile Personal \
  --require-approval never \
  PodcastTrackerCertificateStack

npm run --workspace infra cdk:deploy -- \
  --profile Personal \
  --require-approval never \
  PodcastTrackerConfigStack

npm run --workspace infra cdk:deploy -- \
  --profile Personal \
  --require-approval never \
  PodcastTrackerAuthStack

npm run --workspace infra cdk:deploy -- \
  --profile Personal \
  --require-approval never \
  PodcastTrackerApiDataStack

npm run --workspace infra cdk:deploy -- \
  --profile Personal \
  --require-approval never \
  PodcastTrackerEdgeStack
```

For routine updates (after the first rollout), deploy all stacks together:

```bash
npm run --workspace infra cdk:deploy -- \
  --profile Personal \
  --require-approval never \
  --all
```

Keep the same environment variables present for every redeploy—`ConfigStack` reuses them to update SSM parameters.

### 4.3 Post-deploy checks
- Confirm CloudFormation stacks reached `CREATE_COMPLETE` or `UPDATE_COMPLETE`:
  ```bash
  aws cloudformation describe-stacks \
    --stack-name PodcastTrackerEdgeStack \
    --profile Personal \
    --query "Stacks[0].Outputs"
  ```
- Record key outputs:
  - `PodcastTrackerEdgeStack.SiteBucketName` → site S3 bucket.
  - `PodcastTrackerEdgeStack.CloudFrontDistributionId` → distribution ID (invalidate after web deploys).
  - `PodcastTrackerAuthStack.UserPoolId` / `UserPoolClientId` / `UserPoolDomain`.
  - `PodcastTrackerApiDataStack.GraphQlApiUrl`.
- Verify AppSync GraphQL API responds:
  ```bash
  aws appsync get-graphql-api \
    --api-id <GraphQlApiId> \
    --profile Personal
  ```
- Spot-check DynamoDB table status:
  ```bash
  aws dynamodb describe-table \
    --table-name podcast-tracker \
    --profile Personal \
    --query "Table.TableStatus"
  ```

## 5. Infrastructure rollback
- If a deployment fails, CloudFormation automatically rolls back. Watch progress with:
  ```bash
  aws cloudformation describe-stack-events \
    --stack-name PodcastTrackerApiDataStack \
    --profile Personal
  ```
- To restore a previous known-good version:
  1. Check out the desired git commit/tag.
  2. Reapply environment variables (secrets must match the target state).
  3. Redeploy the affected stacks:
     ```bash
     npm run --workspace infra cdk:deploy -- \
       --profile Personal \
       --require-approval never \
       --use-previous-parameters \
       PodcastTrackerApiDataStack
     ```
- If configuration drift exists (e.g., manual console edits), run `cdk diff` to review and reconcile before redeploying.

## 6. Static web deployment
The frontend is an Astro build published to the private S3 bucket created by `PodcastTrackerEdgeStack`.

### 6.1 Build the site
```bash
npm run --workspace apps/web build
```
The build emits static assets under `apps/web/dist`. Optionally archive the directory with a commit identifier to simplify rollbacks.

### 6.2 Publish to S3
Fetch the bucket name from stack outputs, then sync:
```bash
SITE_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name PodcastTrackerEdgeStack \
  --profile Personal \
  --query "Stacks[0].Outputs[?OutputKey=='SiteBucketName'].OutputValue" \
  --output text)

aws s3 sync apps/web/dist "s3://${SITE_BUCKET}/" \
  --delete \
  --profile Personal
```

### 6.3 Invalidate CloudFront
```bash
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name PodcastTrackerEdgeStack \
  --profile Personal \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id "${DISTRIBUTION_ID}" \
  --paths "/*" \
  --profile Personal
```

### 6.4 Smoke tests
- Visit `https://podcast.casperkristiansson.com`.
- Confirm TLS chain, security headers, and that the placeholder/index renders.
- Exercise Google login and key GraphQL flows once the frontend is wired.

## 7. Web rollback
- Reuse a previously archived `dist` build or re-run `npm run --workspace apps/web build` at an earlier git revision.
- Resync the older assets to S3 and issue another `create-invalidation`.
- If the issue is isolated to configuration (e.g., wrong headers), confirm CloudFront behaviors in the CDK stack and redeploy `PodcastTrackerEdgeStack`.

## 8. Useful CLI references
- List deployed stacks: `npm run --workspace infra cdk ls -- --profile Personal`.
- Tail Spotify proxy logs (after CloudWatch setup): `aws logs tail /aws/lambda/spotifyProxy --follow --profile Personal`.
- Check DynamoDB TTL status: `aws dynamodb describe-time-to-live --table-name podcast-tracker --profile Personal`.
- Remove a failed stack (rare): `aws cloudformation delete-stack --stack-name <StackName> --profile Personal`.

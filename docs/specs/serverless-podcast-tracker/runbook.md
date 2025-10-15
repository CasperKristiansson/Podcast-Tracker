# Serverless Podcast Tracker — CDK Bootstrap Runbook

Use this runbook to prepare the AWS environments for the single-production deployment. The infrastructure CDK app targets `eu-north-1` for all workloads and `us-east-1` only for the CloudFront ACM certificate. All commands assume the local AWS CLI profile `Personal`.

## Prerequisites

- Node.js ≥ 24.10.0 and npm ≥ 11.6.0 (matches repository engines).
- AWS CLI v2 configured with a profile named `Personal` that has permissions to create CDK bootstrap resources in the target account.
- GitHub domain `casperkristiansson.com` hosted in Route 53 (required for certificate validation).
- Optional: AWS SSO login completed via `aws sso login --profile Personal` when using SSO-backed credentials.

## 1. Install dependencies

```bash
npm install
```

## 2. Verify AWS identity (optional but recommended)

```bash
aws sts get-caller-identity --profile Personal
```

Confirm the returned account matches the target production account.

## 3. Bootstrap `eu-north-1` (application stacks)

The CDK app deploys all workload stacks (Edge, Auth, API, Data, Jobs, Config) into `eu-north-1`.

```bash
export CDK_NEW_BOOTSTRAP=1
npm run --workspace infra cdk bootstrap \
  aws://<ACCOUNT_ID>/eu-north-1 \
  --profile Personal
unset CDK_NEW_BOOTSTRAP
```

Notes:
- Replace `<ACCOUNT_ID>` with the value from the STS call.
- `CDK_NEW_BOOTSTRAP=1` enables the modern bootstrap template (required for GitHub OIDC deployments).

## 4. Bootstrap `us-east-1` (CloudFront certificate stack)

The ACM certificate for `podcast.casperkristiansson.com` must reside in `us-east-1`.

```bash
export CDK_NEW_BOOTSTRAP=1
npm run --workspace infra cdk bootstrap \
  aws://<ACCOUNT_ID>/us-east-1 \
  --profile Personal
unset CDK_NEW_BOOTSTRAP
```

## 5. Validate bootstrap success

List stacks recognized by CDK:

```bash
npm run --workspace infra cdk ls --profile Personal
```

-Expected output (placeholders until stacks are implemented):
- `PodcastTrackerConfigStack`
- `PodcastTrackerEdgeStack`

Bootstrap stacks can also be confirmed via the AWS Console (CloudFormation Stacks named `CDKToolkit` in each region).

## 6. Troubleshooting

- **Missing permissions:** Ensure the `Personal` profile credentials include CloudFormation, S3, IAM, and ECR permissions required by the CDK bootstrap template.
- **DNS validation for certificates:** Route 53 hosted zone `casperkristiansson.com` must exist in the same account for automated validation.
- **Environment variables:** If using `direnv` or similar tools, verify `AWS_PROFILE=Personal` to avoid mixing credentials.
- **Cleanup:** To remove bootstrap resources (rare), run `cdk bootstrap ... --destroy`. Use with caution—other stacks may depend on the bootstrap resources.

## 7. Next steps

After both regions are bootstrapped, continue with infrastructure implementation tasks (CertStack, EdgeStack, ConfigStack, etc.) using the same profile and regions established here.

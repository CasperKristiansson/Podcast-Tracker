# Serverless Podcast Tracker — Implementation Plan

This plan turns the approved requirements and design into small, reversible tasks grouped into safe-to-ship milestones. Tasks target 15–90 minutes, prefer small PRs, and avoid coupling where possible. Local deployments use AWS profile `Personal`. Regional policy: all workloads in `eu-north-1` except the CloudFront ACM certificate in `us-east-1`.

## A) Backlog

- [x] T-serverless-podcast-tracker-01: Monorepo scaffold (45m)
  - Goal: Initialize npm/pnpm workspaces and repo layout to match requirements.
  - Files/paths: `/package.json`, `/pnpm-workspace.yaml` (or npm workspaces), `/apps/{web,api}`, `/packages/{lambdas,shared,ui}`, `/infra`.
  - Key edits: Define workspaces, add root scripts, add `.gitignore` entries; no functional code.
  - Dependencies: None.
  - Estimate: 45m

- [x] T-serverless-podcast-tracker-02: TypeScript strict + ESLint baseline (45m)
  - Goal: Enable TS `strict: true` and flat ESLint with `typescript-eslint` across packages.
  - Files/paths: `/tsconfig.base.json`, `**/tsconfig.json`, `/eslint.config.mjs`.
  - Key edits: Shared TS config, extend in subprojects; add lint script.
  - Dependencies: T-01.
  - Estimate: 45m

- [x] T-serverless-podcast-tracker-03: CDK app init (eu-north-1) (30m)
  - Goal: Initialize CDK v2 TS app under `/infra` with basic bin/stack wiring.
  - Files/paths: `/infra/bin/cdk.ts`, `/infra/lib/`.
  - Key edits: CDK app, env selection default `eu-north-1` using profile `Personal` for local.
  - Dependencies: T-01, T-02.
  - Estimate: 30m

- [x] T-serverless-podcast-tracker-04: CDK bootstrap (both regions) runbook (30m)
  - Goal: Author runbook with bootstrap commands for `eu-north-1` (app) and `us-east-1` (ACM).
  - Files/paths: `/docs/specs/serverless-podcast-tracker/runbook.md`.
  - Key edits: Commands with `--profile Personal`, single-production-environment guidance, region prerequisites.
  - Dependencies: T-03.
  - Estimate: 30m

- [x] T-serverless-podcast-tracker-05: CertStack (us-east-1) (60m)
  - Goal: Create DNS-validated ACM certificate for `podcast.casperkristiansson.com` using Route 53 hosted zone `casperkristiansson.com`.
  - Files/paths: `/infra/lib/CertStack.ts`.
  - Key edits: ACM cert in `us-east-1`, outputs cert ARN, DNS validation records.
  - Dependencies: T-03, T-04.
  - Estimate: 60m

- [x] T-serverless-podcast-tracker-06: EdgeStack (eu-north-1) S3+CloudFront+OAC (90m)
  - Goal: Private S3 origin, CloudFront with OAC, default index/error, attach ACM cert ARN, security headers function (optional).
  - Files/paths: `/infra/lib/EdgeStack.ts`.
  - Key edits: Bucket, Distribution, OAC, behaviors, certificate ARN parameter/SSM lookup.
  - Dependencies: T-05.
  - Estimate: 90m

- [x] T-serverless-podcast-tracker-07: Route 53 alias for podcast.casperkristiansson.com (30m)
  - Goal: Create A/AAAA alias to the CloudFront distribution.
  - Files/paths: `/infra/lib/EdgeStack.ts` or `/infra/lib/DnsStack.ts`.
  - Key edits: Alias records in hosted zone.
  - Dependencies: T-06.
  - Estimate: 30m

- [x] T-serverless-podcast-tracker-08: ConfigStack for SSM parameters (30m)
  - Goal: Define SSM paths for secrets and config (Spotify client ID/secret, shared production settings).
  - Files/paths: `/infra/lib/ConfigStack.ts`.
  - Key edits: SSM standard-tier params with AWS-managed KMS; naming like `/podcast/prod/spotify/{client_id|client_secret}`.
  - Dependencies: T-03.
  - Estimate: 30m

- [x] T-serverless-podcast-tracker-09: DataStack DynamoDB single-table + TTL (60m)
  - Goal: Create on-demand table with PK/SK and TTL on `expiresAt` for Cache.
  - Files/paths: `/infra/lib/ApiDataStack.ts`.
  - Key edits: Table schema, optional GSI for ops; outputs table name/ARN.
  - Dependencies: T-03.
  - Estimate: 60m

- [x] T-serverless-podcast-tracker-10: AppSync API skeleton + Cognito auth (60m)
  - Goal: Create AppSync API with Cognito primary auth; add schema placeholder; enable subscriptions.
  - Files/paths: `/infra/lib/ApiDataStack.ts`, `/apps/api/schema/schema.graphql`.
  - Key edits: GraphQL API, authorization modes, schema import.
  - Dependencies: T-07 (Cognito pool), T-09.
  - Estimate: 60m

- [x] T-serverless-podcast-tracker-11: AuthStack Cognito + Google IdP (90m)
  - Goal: Cognito user pool, domain, app client (Auth Code + PKCE), Google IdP; self-registration disabled.
  - Files/paths: `/infra/lib/AuthStack.ts`.
  - Key edits: Pool config, callback/logout URLs, IdP settings (client ID/secret from SSM), scopes.
  - Dependencies: T-08 (SSM params), T-03.
  - Estimate: 90m

- [x] T-serverless-podcast-tracker-12: DDB direct resolvers for core queries (60m)
  - Goal: Configure VTL for `subscriptions` and `episodes` queries and `subscribe`/`markProgress` mutations against DDB.
  - Files/paths: `/infra/lib/ApiDataStack.ts`, `/apps/api/schema/*.graphql`, `/apps/api/resolvers/*.vtl`.
  - Key edits: Data sources, resolvers, mapping templates.
  - Dependencies: T-10, T-09.
  - Estimate: 60m

- [x] T-serverless-podcast-tracker-13: Lambda bundling utility + IAM roles (45m)
  - Goal: Set up CDK `NodejsFunction` defaults (Node 20, esbuild) and least-privilege roles for table/SSM access.
  - Files/paths: `/infra/lib/constructs/LambdaDefaults.ts`, `/infra/lib/ApiDataStack.ts`.
  - Key edits: Shared construct, IAM policies for Spotify/refresh Lambdas.
  - Dependencies: T-03, T-09, T-08.
  - Estimate: 45m

- [x] T-serverless-podcast-tracker-14: spotifyProxy Lambda + caching (90m)
  - Goal: Implement Client Credentials, cache token and responses in DDB `Cache`, handle 429 with backoff.
  - Files/paths: `/packages/lambdas/spotifyProxy/src/index.ts`, `/packages/shared/src/types.ts`.
  - Key edits: Fetch from SSM, DynamoDB cache layer, Spotify API calls, error taxonomy.
  - Dependencies: T-13, T-09, T-08.
  - Estimate: 90m

- [x] T-serverless-podcast-tracker-15: AppSync Lambda resolver for search (45m)
  - Goal: Wire `search(term)` to `spotifyProxy` Lambda; return typed `Show[]`.
  - Files/paths: `/infra/lib/ApiDataStack.ts`, `/apps/api/schema/queries.graphql`.
  - Key edits: Lambda data source + resolver mapping.
  - Dependencies: T-10, T-14.
  - Estimate: 45m

- [x] T-serverless-podcast-tracker-16: refreshSubscribedShows Lambda + schedule (60m)
  - Goal: Nightly EventBridge Scheduler triggers Lambda to upsert latest episodes.
  - Files/paths: `/packages/lambdas/refreshSubscribedShows/src/index.ts`, `/infra/lib/JobsStack.ts`.
  - Key edits: Iterate user subscriptions, call Spotify (via proxy or direct), write episodes; schedule/permissions.
  - Dependencies: T-09, T-13, T-14.
  - Estimate: 60m

- [x] T-serverless-podcast-tracker-17: GraphQL Codegen (45m)
  - Goal: Add GraphQL Code Generator for schema types and React hooks; emit to `packages/shared`.
  - Files/paths: `/codegen.ts`, `/apps/api/schema/**`, `/packages/shared/src/generated/**`.
  - Key edits: Codegen config, scripts.
  - Dependencies: T-10.
  - Estimate: 45m

- [x] T-serverless-podcast-tracker-18: Astro + Tailwind scaffold (60m)
  - Goal: Create Astro app with React + Tailwind (dark mode via `class`).
  - Files/paths: `/apps/web/**`.
  - Key edits: Astro init, Tailwind config, base layout with dark class.
  - Dependencies: T-01.
  - Estimate: 60m

- [x] T-serverless-podcast-tracker-19: Auth UI (Google + PKCE) (90m)
  - Goal: Custom login page, redirect to Cognito authorize with `identity_provider=Google`, handle callback, exchange token, store in `sessionStorage`.
  - Files/paths: `/apps/web/src/pages/{login,callback}.tsx` (or .astro), auth utils.
  - Key edits: PKCE generation, authorize URL, token exchange, error handling.
  - Dependencies: T-11, T-18.
  - Estimate: 90m

- [x] T-serverless-podcast-tracker-20: AppSync client + basic views (60m)
  - Goal: Configure GraphQL client (https + websocket) with Cognito ID token; minimal pages for subscriptions and episodes.
  - Files/paths: `/apps/web/src/lib/graphql.ts`, `/apps/web/src/pages/**`.
  - Key edits: Client init, queries/mutations/subscriptions using generated types.
  - Dependencies: T-17, T-19.
  - Estimate: 60m

- [x] T-serverless-podcast-tracker-21: Feature flags / guarded routes (30m)
  - Goal: Add simple runtime flags (e.g., `SPOTIFY_ENABLED`, `AUTH_READY`) to hide UI routes until backend ready.
  - Files/paths: `/apps/web/src/lib/flags.ts`, `.env*` docs.
  - Key edits: Guard routes/components, default disabled.
  - Dependencies: T-18.
  - Estimate: 30m

- [x] T-serverless-podcast-tracker-22: CI — OIDC to AWS (45m)
  - Goal: Configure IAM role trust for GitHub OIDC; document role ARN/region pairing.
  - Files/paths: `/docs/specs/serverless-podcast-tracker/runbook.md`, AWS console/IaC (optional).
  - Key edits: Trust policy, permissions boundaries for `cdk deploy`, S3 sync, CloudFront invalidation.
  - Dependencies: T-03, T-06.
  - Estimate: 45m

- [x] T-serverless-podcast-tracker-23: CI — ci.yml (45m)
  - Goal: Build, type-check (`tsc --noEmit`), lint, and test on PR.
  - Files/paths: `/.github/workflows/ci.yml`.
  - Key edits: Node setup, pnpm/npm cache, run scripts.
  - Dependencies: T-02, T-01.
  - Estimate: 45m

- [ ] T-serverless-podcast-tracker-24: CI — deploy-infra.yml (60m)
  - Goal: `cdk synth` and `cdk deploy --require-approval never` to production on push to `main`.
  - Files/paths: `/.github/workflows/deploy-infra.yml`.
  - Key edits: Configure-aws-credentials action (pinned), region `eu-north-1`, use cert in `us-east-1` if included.
  - Dependencies: T-22, T-03, T-05..T-07, T-08..T-13.
  - Estimate: 60m

- [ ] T-serverless-podcast-tracker-25: CI — deploy-web.yml (45m)
  - Goal: Build Astro, sync to S3, and invalidate CloudFront.
  - Files/paths: `/.github/workflows/deploy-web.yml`.
  - Key edits: Artifact build/upload, aws cli sync to site bucket, invalidate distribution.
  - Dependencies: T-06, T-18.
  - Estimate: 45m

- [ ] T-serverless-podcast-tracker-26: Observability — logs, metrics, alarms (60m)
  - Goal: Structured logs in Lambdas; CloudWatch metrics and alarms (errors, throttles, 429s, cache hit rate).
  - Files/paths: `/infra/lib/Observability.ts`, Lambda logging utils.
  - Key edits: Alarm thresholds, dashboards (optional).
  - Dependencies: T-13..T-16.
  - Estimate: 60m

- [ ] T-serverless-podcast-tracker-27: Security headers (CloudFront Function) (30m)
  - Goal: Add optional CloudFront Function to inject HSTS, CSP (basic), X-Frame-Options, etc.
  - Files/paths: `/infra/lib/EdgeStack.ts`, `/infra/lib/functions/securityHeaders.js`.
  - Key edits: Attach function to viewer response; safe defaults.
  - Dependencies: T-06.
  - Estimate: 30m

- [ ] T-serverless-podcast-tracker-28: Deployment runbook & rollback (45m)
  - Goal: Document deploy/rollback for infra and web; regional considerations and profile usage.
  - Files/paths: `/docs/specs/serverless-podcast-tracker/runbook.md`.
  - Key edits: CDK workflow, bootstrap notes, rollback steps, emergency playbook.
  - Dependencies: T-04, T-24, T-25.
  - Estimate: 45m

- [ ] T-serverless-podcast-tracker-29: MVP QA pass & AC verification (60m)
  - Goal: End-to-end verify all ACs; capture screenshots/notes.
  - Files/paths: `/docs/specs/serverless-podcast-tracker/verification.md`.
  - Key edits: Checklist results, links to CloudFront URL and domain.
  - Dependencies: All prior tasks in milestones.
  - Estimate: 60m

## B) Milestones

- Milestone 1 — Foundations & Edge (Safe placeholder site)
  - Includes: T-01, T-02, T-03, T-04, T-05, T-06, T-07
  - Exit criteria: CloudFront distribution live at `https://podcast.casperkristiansson.com` serving a placeholder index over HTTPS with valid ACM (us-east-1) and OAC locked S3 origin.

- Milestone 2 — Config & Data Layer
  - Includes: T-08, T-09
  - Exit criteria: DynamoDB table provisioned with TTL; SSM parameters created.

- Milestone 3 — Auth
  - Includes: T-11
  - Exit criteria: Cognito User Pool with Google IdP configured, app client enabled (Auth Code + PKCE), self-registration disabled, domain and callback/logout URLs set.

- Milestone 4 — API Surface
  - Includes: T-10, T-12
  - Exit criteria: AppSync API deployed with Cognito auth, schema baseline, DDB direct resolvers for subscriptions/episodes/progress.

- Milestone 5 — Integrations & Jobs
  - Includes: T-13, T-14, T-15, T-16
  - Exit criteria: spotifyProxy Lambda wired to `search`; caching operational; nightly refresh job scheduled and writing episodes.

- Milestone 6 — Frontend MVP
  - Includes: T-17, T-18, T-19, T-20, T-21
  - Exit criteria: Login with Google works end-to-end (PKCE), subscriptions and episodes views render; non-ready routes guarded by flags.

- Milestone 7 — CI/CD
  - Includes: T-22, T-23, T-24, T-25
  - Exit criteria: CI passes on PR; pushing to `main` deploys infra and web via OIDC.

- Milestone 8 — Observability & Hardening
  - Includes: T-26, T-27, T-28
  - Exit criteria: Alarms configured; optional security headers enabled; runbook complete.

- Milestone 9 — MVP Verification
  - Includes: T-29
  - Exit criteria: All acceptance criteria verified and documented.

## C) AC Checklist (who verifies)

- [ ] AC-serverless-podcast-tracker-01 — Google-only sign-in (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-02 — Self-registration disabled (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-03 — Token exchange completes (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-04 — AppSync authorized via Cognito (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-05 — Unauthorized API rejected (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-06 — Search via Lambda + cache (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-07 — Subscriptions list from DynamoDB (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-08 — Episodes pagination (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-09 — Subscribe upsert (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-10 — Progress update (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-11 — Real-time progress updates (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-12 — Spotify Client Credentials (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-13 — Rate limiting handled (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-14 — Nightly refresh runs (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-15 — S3+CloudFront with OAC (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-16 — Cache TTL enforced (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-17 — CI checks run on PR (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-18 — Infra deploy on main (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-19 — Web deploy invalidation (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-20 — Google-only enforced (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-21 — Custom domain served over HTTPS (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-22 — Local AWS profile Personal used (Verifier: Dev)
- [ ] AC-serverless-podcast-tracker-23 — Region strategy enforced (Verifier: Dev)

## D) Context Digest

- docs/specs/serverless-podcast-tracker/requirements.md — Source of acceptance criteria and scope.
- docs/specs/serverless-podcast-tracker/design.md — Architecture, boundaries, region strategy, and domain settings.
- . (root) — Minimal repo with docs structure; no source code yet.

---

Ready to implement

- Please approve: `docs/specs/serverless-podcast-tracker/requirements.md`, `docs/specs/serverless-podcast-tracker/design.md`, and this plan `docs/specs/serverless-podcast-tracker/tasks.md`.

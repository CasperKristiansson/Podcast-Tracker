# Serverless Podcast Tracker — Requirements

## 1. Summary

Build a serverless podcast tracker with Google-only authentication, a modern dark UI, and near-zero operational cost. Prioritize backend infrastructure and APIs first, using AWS CDK v2 (TypeScript) for IaC. Frontend is Astro + React, deployed as static assets to S3 behind CloudFront (OAC). Data is stored in DynamoDB. AppSync (GraphQL) provides queries, mutations, and real-time subscriptions. Spotify integration runs via Lambda using Client Credentials with aggressive caching and rate-limit handling.

Primary Region: All workloads (Cognito, AppSync, DynamoDB, Lambda, EventBridge, SSM, S3 origin) are deployed in `eu-north-1`. The CloudFront TLS certificate must be in `us-east-1` (ACM requirement) while CloudFront itself is global.

## 2. Business Context and Goals

- Offer a simple, privacy-conscious podcast tracking app focused on personal use and a small user base.
- Keep cost ≈ $0 by relying on static hosting and on-demand serverless services (no always-on compute).
- Ship backend first so core capabilities (auth, data, API, integration, jobs) are production-ready before adding a polished UI.
- Maintain a single repository with clear, repeatable IaC (AWS CDK v2 TypeScript) and CI/CD via GitHub Actions using OIDC to AWS.

## 3. In Scope and Out of Scope

In scope

- AWS CDK v2 (TypeScript) stacks for: Edge (S3+CloudFront OAC), Auth (Cognito + Google IdP), API (AppSync GraphQL), Data (DynamoDB + TTL), Jobs (EventBridge Scheduler), Config (SSM Parameter Store for secrets).
- Lambda functions for Spotify proxy and nightly refresh job.
- AppSync GraphQL schema, resolvers (DynamoDB direct resolvers, Lambda for Spotify), and subscriptions.
- Astro + React + Tailwind (dark mode via class strategy) frontend scaffold; Radix/shadcn components.
- TypeScript strict mode across repo; ESLint with typescript-eslint; GraphQL Code Generator for types/hooks.
- CI/CD using GitHub Actions with OIDC to AWS, including infra deploy and web deploy.

Out of scope

- Non-Google identity providers; email/password sign-in, hosted Cognito UI screens.
- SSR/Edge compute frameworks for the frontend; server rendering beyond Astro static.
- Non-AWS cloud providers; relational databases; self-hosted infra.
- Advanced recommendation/ML features; social/sharing features; payments/billing.
- Native mobile applications.

## 4. Users and Use Cases

Users

- Authenticated end users signing in with Google who want to search, subscribe to shows, and track listening progress.
- Maintainers (dev/ops) who deploy infrastructure and code through CI/CD.

Primary use cases

- Search shows by term (Spotify catalog via proxy Lambda).
- Subscribe/unsubscribe to shows.
- List episodes for subscribed shows; browse episodes of a show with pagination.
- Track playback progress per episode (position in seconds, completed flag) with real-time updates to the user’s session.
- Automated nightly refresh to upsert latest episodes for subscribed shows.

## 5. Functional Requirements

Architecture

- Frontend: Astro + React, Tailwind (dark-mode via class on html), Radix/shadcn components. Built as static assets, deployed to S3 and served via CloudFront with Origin Access Control (OAC). Default index/error objects configured. Optional CloudFront Function for security headers. Custom domain `podcast.casperkristiansson.com` served via CloudFront with an ACM certificate in `us-east-1` and Route 53 A/AAAA alias from the hosted zone `casperkristiansson.com`.
- Auth: Cognito User Pool with Google IdP configured. Self-registration disabled. App client supports OAuth 2.0 Authorization Code + PKCE. Custom login page redirects users directly to Cognito `/oauth2/authorize` with `identity_provider=Google` so only Google consent is shown. Frontend completes token exchange at `/oauth2/token` and uses ID token to call AppSync. Callback and logout URLs configured.
- API: AWS AppSync GraphQL. Primary auth mode: Cognito User Pools. Additional auth mode (IAM) for Lambda ingestion where required. Real-time via subscriptions.
- Data: DynamoDB tables (on-demand). TTL on Cache table items for spotify response caching.
- Integrations: Spotify Web API via Lambda using Client Credentials (no secret in browser). Aggressive caching in DynamoDB and rate-limit handling (429 backoff, retry).
- Jobs: EventBridge Scheduler triggers nightly Lambda to refresh and upsert newest episodes for user subscriptions.
- Secrets: SSM Parameter Store (standard tier) with AWS-managed KMS for encryption at rest.
- Regions: Deploy all regional services to `eu-north-1` (Cognito, AppSync, DynamoDB, Lambda, EventBridge, SSM, S3 origin). Provision the CloudFront ACM certificate in `us-east-1` (required for CloudFront). CloudFront is global; Route 53 hosted zone is global.

Data Model (DynamoDB)

- User: `pk=user#<sub>`, `sk=meta`
- Subscription: `pk=user#<sub>`, `sk=sub#<showId>`
- Progress: `pk=user#<sub>`, `sk=ep#<episodeId>`, `positionSec`, `completed`
- Show: `pk=show#<spotifyShowId>`, `sk=meta`, `title`, `publisher`, `image`, `feedUrl?`, `lastSeen`
- Episode: `pk=show#<spotifyShowId>`, `sk=ep#<episodeId>`, `title`, `audioUrl`, `publishedAt`, `durationSec`
- Cache: `pk=cache#<key>`, `sk=spotify`, `payload`, `expiresAt` (with TTL on `expiresAt`)

GraphQL Surface (AppSync)

- Query
  - `search(term: String!): [Show!]!` → Lambda (Spotify) + cache
  - `subscriptions: [Subscription!]!` → DynamoDB direct resolver
  - `episodes(showId: ID!, cursor: String, limit: Int = 50): [Episode!]!` → DynamoDB direct resolver
- Mutation
  - `subscribe(showId: ID!): Subscription!` → DynamoDB
  - `markProgress(episodeId: ID!, positionSec: Int!, completed: Boolean): Progress!` → DynamoDB
- Subscription
  - `progressUpdated(userId: ID!): Progress!` → broadcast to the user via AppSync subscriptions

Auth Flow (Google only, custom UI)

1. Login page shows a single “Continue with Google”.
2. Redirect to `https://<cognito-domain>/oauth2/authorize?...&identity_provider=Google&response_type=code&code_challenge=...` (PKCE).
3. Cognito sends the user to Google; after consent, Cognito exchanges the code and redirects to the app’s callback with `code`.
4. Frontend exchanges `code` for tokens at `/oauth2/token`, stores tokens securely, and calls AppSync with the ID token. Self sign-up is disabled.

CI/CD (GitHub Actions)

- OIDC to AWS; no long-lived credentials in repo.
- Local development uses AWS CLI/SDK profile `Personal` for CDK bootstrap/deploy and any manual S3 sync operations. Use region `eu-north-1` for all stacks except the ACM certificate stack in `us-east-1`.
- Workflows:
  - `ci.yml`: install, build, type-check (`tsc --noEmit`), lint, test on PRs.
  - `deploy-infra.yml`: configure AWS credentials (pinned action), `cdk synth`, `cdk deploy --require-approval never` to dev on push to `main`.
  - `deploy-web.yml`: build Astro, `aws s3 sync` to site bucket (private), CloudFront invalidation.

Type Safety & Quality

- TypeScript `strict: true` across repo.
- ESLint (flat config) + typescript-eslint for TS rules.
- GraphQL Code Generator for schema types and React hooks.

## 6. Acceptance Criteria (Gherkin)

Scenario: AC-serverless-podcast-tracker-01 — Google-only sign-in
Given an unauthenticated user on the login page
When the user clicks “Continue with Google”
Then the browser navigates to `https://<cognito-domain>/oauth2/authorize` with `identity_provider=Google` and a valid PKCE `code_challenge`
And no Cognito hosted UI screen is shown prior to Google

Scenario: AC-serverless-podcast-tracker-02 — Self-registration disabled
Given the Cognito user pool
When a new user attempts self sign-up
Then the action is blocked by configuration

Scenario: AC-serverless-podcast-tracker-03 — Token exchange completes on callback
Given a user is redirected to the app with an authorization `code`
When the frontend posts to `/oauth2/token` with valid PKCE parameters
Then ID and access tokens are returned and stored securely client-side

Scenario: AC-serverless-podcast-tracker-04 — AppSync authorized via Cognito
Given a valid Cognito ID token
When the client calls the AppSync GraphQL API
Then the request is authorized under the Cognito User Pools auth mode

Scenario: AC-serverless-podcast-tracker-05 — Unauthorized API rejected
Given no token or an invalid token
When the client calls the AppSync GraphQL API
Then the request is rejected with an authorization error

Scenario: AC-serverless-podcast-tracker-06 — Search routes via Lambda + cache
Given the GraphQL `search` query
When the client searches a term
Then the resolver invokes a Lambda that queries Spotify or returns a cached response
And responses are cached in DynamoDB `Cache` with TTL

Scenario: AC-serverless-podcast-tracker-07 — Subscriptions list from DynamoDB
Given an authenticated user
When the client calls `subscriptions`
Then items are returned from the `Subscription` partition keyed by `user#<sub>`

Scenario: AC-serverless-podcast-tracker-08 — Episodes pagination per show
Given a `showId`
When the client calls `episodes(showId, cursor, limit)`
Then episodes are returned from `Episode` items for the show with pagination cursors

Scenario: AC-serverless-podcast-tracker-09 — Subscribe mutation upserts item
Given a `showId`
When the client calls `subscribe(showId)`
Then a `Subscription` item is created or updated for `user#<sub>` and `sub#<showId>`

Scenario: AC-serverless-podcast-tracker-10 — Progress mutation updates state
Given an `episodeId` and playback information
When the client calls `markProgress(episodeId, positionSec, completed)`
Then a `Progress` item is upserted with the new values

Scenario: AC-serverless-podcast-tracker-11 — Real-time progress updates
Given a user is subscribed to `progressUpdated(userId)`
When their `markProgress` mutation completes
Then the `Progress` payload is published only to that user’s subscription session

Scenario: AC-serverless-podcast-tracker-12 — Spotify Client Credentials flow
Given the Spotify Lambda has access to client ID/secret in SSM
When the Lambda requests an access token
Then a token is obtained and cached until expiry

Scenario: AC-serverless-podcast-tracker-13 — Spotify rate limiting handled
Given Spotify returns HTTP 429
When the Lambda retries based on backoff and retry-after headers
Then the request eventually succeeds or fails gracefully without exhausting retries

Scenario: AC-serverless-podcast-tracker-14 — Nightly refresh runs
Given EventBridge Scheduler is configured
When the nightly schedule triggers
Then the refresh Lambda runs and upserts the latest episodes for all user subscriptions

Scenario: AC-serverless-podcast-tracker-15 — S3+CloudFront with OAC
Given the site bucket is private
When the CloudFront distribution is created with OAC
Then only CloudFront may access S3 and the site is publicly accessible via CloudFront

Scenario: AC-serverless-podcast-tracker-16 — Cache TTL enforced
Given a cached Spotify response with `expiresAt`
When `expiresAt` has passed
Then DynamoDB TTL removes the item and the next request fetches fresh data

Scenario: AC-serverless-podcast-tracker-17 — CI checks run on PR
Given a pull request is opened
When CI runs
Then install, build, `tsc --noEmit`, lint, and tests complete successfully

Scenario: AC-serverless-podcast-tracker-18 — Infra deploy on main
Given a push to `main`
When `deploy-infra.yml` runs with OIDC
Then `cdk synth` and `cdk deploy --require-approval never` apply to dev successfully

Scenario: AC-serverless-podcast-tracker-19 — Web deploy invalidates CDN
Given a push to `main` affecting the web app
When `deploy-web.yml` runs
Then Astro build artifacts are synced to S3 and CloudFront invalidation completes

Scenario: AC-serverless-podcast-tracker-20 — Google-only enforced
Given the login flow
When a user attempts any non-Google identity provider
Then authentication is not available and access is denied

Scenario: AC-serverless-podcast-tracker-21 — Custom domain served over HTTPS
Given a Route 53 hosted zone for `casperkristiansson.com` exists in the AWS account
When the Edge stack is deployed
Then an ACM certificate in `us-east-1` for `podcast.casperkristiansson.com` is validated and attached to the CloudFront distribution
And Route 53 A/AAAA alias records point `podcast.casperkristiansson.com` to the distribution
And an HTTPS GET to `https://podcast.casperkristiansson.com` returns 200 for the site index

Scenario: AC-serverless-podcast-tracker-22 — Local AWS profile Personal used for CDK
Given a developer has an AWS CLI profile named `Personal` configured
When they run `cdk bootstrap` or `cdk deploy` according to the runbook
Then the commands succeed using the `Personal` profile without additional credential configuration

Scenario: AC-serverless-podcast-tracker-23 — Region strategy enforced
Given the infrastructure stacks are defined in CDK
When deploying the application
Then all regional resources (Cognito, AppSync, DynamoDB, Lambda, EventBridge, SSM, S3 origin) are created in `eu-north-1`
And the CloudFront ACM certificate is created in `us-east-1`
And the CloudFront distribution serves the custom domain using that certificate

## 7. Non-Functional Requirements

Performance

- AppSync P95 latency for simple queries (subscriptions list) ≤ 250 ms (excluding client network). Spotify search via cache ≤ 300 ms P95 when cache hit; ≤ 1.5 s P95 on cache miss.
- Nightly refresh completes within 10 minutes for up to 10k subscriptions total across all users.

Security

- Cognito User Pool with Google IdP; self-registration disabled. OAuth 2.0 Authorization Code + PKCE.
- CloudFront OAC restricts S3 bucket access; bucket is private. TLS 1.2+ enforced on CloudFront.
- AppSync primary auth mode is Cognito; IAM used only for backend ingestion. Fine-grained IAM for Lambdas and AppSync data sources.
- Secrets stored in SSM Parameter Store (standard) with AWS-managed KMS; no secrets in repo or frontend.
- DynamoDB, S3, and CloudFront logs enabled where practical; least-privilege IAM.

Privacy

- Store minimal user data (Cognito subject, subscriptions, progress). No email or profile data persisted unless required for functionality.
- No third-party trackers/analytics by default. Tokens stored only client-side; server-side tokens only for Spotify Client Credentials.

Availability

- Target 99.9% for reading the static site and AppSync API in a single-region deployment (`eu-north-1`). CloudFront provides global edge presence for static content and serves the custom domain `podcast.casperkristiansson.com` over HTTPS with an ACM certificate in `us-east-1`.
- Rollback via CDK and versioned S3 assets; CloudFront invalidation supports quick content rollback.

Cost

- Use on-demand DynamoDB capacity, avoid provisioned throughput. Rely on free/near-free tiers for S3, DynamoDB, Lambda, AppSync where possible.
- Keep Spotify requests minimal via aggressive caching; avoid unnecessary Lambda invocations.
- No always-on compute; use EventBridge Scheduler for batch work.

Observability

- Structured logs on Lambdas. CloudWatch alarms for error rates and throttling on Lambdas and DynamoDB.

Quality

- TypeScript strict mode enforced across repo. ESLint (flat) and typescript-eslint; CI enforces type checks and lint.

## 8. Compliance and Regulatory

- GDPR/CCPA: limit PII to what is necessary (Cognito subject ID). Document retention and user data deletion on request. No marketing cookies/trackers by default.
- Data residency: confirm chosen AWS region and communicate it in privacy notice.
- Vendor DPAs: rely on AWS and Google standard terms. Follow Spotify Developer TOS and rate-limit policies.

## 9. Risks and Mitigations

- Spotify API policy changes or access restrictions
  - Mitigation: cache aggressively; implement resilient fallback errors; feature-flag Spotify-dependent features.
- Rate limits and throttling (Spotify, DynamoDB, AppSync)
  - Mitigation: exponential backoff, retry-after handling, cache; CloudWatch alarms on throttling.
- Misconfigured Cognito (domains, callback URLs, PKCE)
  - Mitigation: automated CDK outputs, environment variables validation in CI; runbook documentation.
- Secrets leakage
  - Mitigation: store secrets only in SSM; OIDC to AWS for CI; no secrets in repo or frontend.
- Cost creep (unexpected AppSync/Lambda usage)
  - Mitigation: enable AWS Budgets/alerts; cache and batch operations where possible.

## 10. Assumptions and Dependencies

- An AWS account with permission to bootstrap and deploy CDK v2 stacks; local AWS CLI profile `Personal` is available for developers.
- CDK bootstrapped in `eu-north-1` (all stacks) and in `us-east-1` (certificate stack for CloudFront only).
- A registered Cognito domain and Google OAuth credentials (client ID/secret) stored in SSM Parameter Store.
- Spotify Developer application for Client Credentials flow.
- GitHub repository with Actions and AWS OIDC role configured.
- Node.js 20.x toolchain; npm or pnpm workspaces for monorepo; TypeScript configured strict.
- The domain `casperkristiansson.com` is registered and managed in Route 53. The application will be hosted at `podcast.casperkristiansson.com` via CloudFront with Route 53 alias records and an ACM certificate in `us-east-1`. All other workloads run in `eu-north-1`.

## 11. Open Questions

- Which AWS region(s) should host Cognito, AppSync, and DynamoDB?
- Exact TTL durations for `Cache` (token vs. response caching) and episode refresh policies.
- Final GraphQL pagination shape for `episodes` (cursor format, max limit).
- Required callback and logout URLs per environment (dev/prod); how many environments to support initially?
- Naming conventions for SSM parameters; secret rotation cadence.
- Should we store/display minimal show/episode metadata only from Spotify, or also enrich from RSS if available (`feedUrl`)?
- What minimum logging/metrics dashboards are required for MVP?

## 12. Context Digest

- . (root) — Minimal repository; no code/config present yet.
- docs/ — Documentation directory exists.
- docs/specs/ — Specs directory exists and was empty prior to this requirements file.

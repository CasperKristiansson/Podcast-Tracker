# Testing Tasks

## Unit Test Tasks

- [x] Configure Vitest test runner
  - `vitest` and `@vitest/coverage-v8` added to repo `devDependencies`
  - Root `vitest.config.ts` resolves workspace paths and targets Node 24
  - `npm run test -- --run` executes and succeeds with a scaffold test suite
- [x] Mock AWS service dependencies
  - Introduce `@aws-sdk/client-mock` utilities under `packages/lambdas/spotifyProxy/test`
  - Provide shared mock builders for DynamoDB and SSM clients
  - Update Vitest setup file to reset mocks between specs
- [ ] Cover cache hit/miss logic
  - Write unit specs for `getCachedValueOrFetch` covering hit, miss, and TTL expiry flows
  - Validate DynamoDB `GetCommand`/`PutCommand` inputs with assertions on mock calls
  - Document expected cache behavior in test names for quick review
- [ ] Assert error handling paths
  - Add specs ensuring missing arguments emit the expected errors (`term`, `showId`)
  - Simulate Spotify API failures and confirm retries bubble appropriate exceptions
  - Capture token refresh failures to confirm handler short-circuits gracefully

## Integration Test Tasks

- [ ] Provision test infrastructure sandbox
  - Define LocalStack (or sandbox AWS account) profile in infra docs and `.env.test`
  - Create dedicated DynamoDB table + SSM parameters via CDK test stack
  - Document start/stop commands for the sandbox environment
- [ ] Execute Lambda integration flow
  - Run the Spotify proxy Lambda against sandbox resources with seeded data
  - Validate end-to-end cache population by asserting DynamoDB item contents
  - Confirm Spotify API stubs return deterministic payloads for repeatable runs
- [ ] Automate CI test stage
  - Add `npm run test:unit` and `npm run test:integration` scripts invoked by pipeline
  - Ensure CI workflow spins up sandbox services before integration suite executes
  - Publish coverage report artifacts for review after each pipeline run

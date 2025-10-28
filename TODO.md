# VTL Test Coverage To‑Dos

These items track additional scenarios we should cover with automated tests when exercising the AppSync mapping templates via `EvaluateMappingTemplate`. Each entry references the specific `.vtl` file(s) and the behavior we still need to validate.

## Mutation.subscribe.request.vtl
- [ ] **Missing required metadata** – Simulate calls where `title` or `publisher` is omitted and assert that the template invokes `$util.error` with a `BadRequest`. This ensures validation logic keeps guarding against incomplete subscriptions.
- [ ] **Non-numeric `totalEpisodes` input** – Provide `totalEpisodes` as a string (e.g., `"12"`) to confirm the request template still stores a numeric value in DynamoDB.

## Mutation.subscribe.response.vtl
- [ ] **Direct DynamoDB payload** – Feed `$ctx.result` with actual AttributeValue shapes to confirm the template removes `pk`, `sk`, and `dataType` while returning the remaining fields without falling back to the stash.

## Mutation.unsubscribe.response.vtl
- [ ] **Falsy result handling** – Verify that when `$ctx.result` is null/empty the template returns `false`, covering the negative branch in addition to the current truthy and error paths.

## Mutation.markProgress.request.vtl
- [ ] **Boolean edge cases** – Pass `completed: false` explicitly and ensure the attribute map sets `BOOL: false` rather than omitting the field.
- [ ] **Missing `completed` argument** – Confirm the template errors (or behaves as intended) when the client omits `completed`, matching backend expectations.
- [ ] **Blank `showId`** – Provide an empty string for `showId` and ensure it is treated as absent (i.e., not persisted).

## Mutation.markProgress.response.vtl
- [ ] **Unexpected attributes pass-through** – Supply a result map that includes additional fields (e.g., `extraMeta`) and assert the template returns them untouched when the data source responds directly.

## Mutation.rateShow.request.vtl
- [ ] **Whitespace-only review** – Submit a review string containing only spaces and verify the template executes the `REMOVE ratingReview` branch so DynamoDB doesn’t store blank reviews.
- [ ] **Boundary star ratings** – Exercise minimum/maximum star values (e.g., `0` and `100`) to confirm no validation logic rejects out-of-range inputs unexpectedly.

## Mutation.rateShow.response.vtl
- [ ] **Attributes object response** – Provide a payload nested under `Attributes` (the DynamoDB UpdateItem shape) and assert the template returns it as-is, matching current pass-through behavior.
- [ ] **Plain object response** – Repeat with an already-flattened object to guarantee nothing breaks when the data source skips AttributeValue typing.

## Query.mySubscriptions.request.vtl
- [ ] **Null/empty inputs** – Call the template with `limit: null`, `limit: "10"`, or `nextToken: ""` to verify the expression values mirror AppSync defaults without crashing.

## Query.mySubscriptions.response.vtl
- [ ] **Multiple items with null entries** – Feed a result set containing valid subscriptions plus a `null` element to confirm the loop skips falsy nodes.
- [ ] **Additional fields** – Include optional attributes (e.g., `subscriptionSyncedAt`, `ratingStars`) in the result and assert they survive the transformation alongside `showId/title/publisher/totalEpisodes`.

![Podcast Tracker preview](docs/assets/podcast-tracker-preview.jpg)

# Podcast Tracker

Podcast Tracker keeps tabs on every show you follow by syncing with the Spotify catalog so new releases surface automatically. A dedicated episode page highlights the latest drops and gives you quick context before you press play. Each show has its own page with rich details, letting you decide what deserves a spot in your queue. Your personal profile page remembers listening history and makes it easy to pick up where you left off while discovering fresh episodes.

## Technologies

- [Astro](https://astro.build/) and [TypeScript](https://www.typescriptlang.org/) drive the web app, with [Tailwind CSS](https://tailwindcss.com/) handling responsive styling.
- [GraphQL](https://graphql.org/) powers the API, with [Apollo Client](https://www.apollographql.com/docs/react/) and [GraphQL Code Generator](https://the-guild.dev/graphql/codegen) managing strongly typed queries.
- [AWS Lambda](https://aws.amazon.com/lambda/) and [DynamoDB](https://aws.amazon.com/dynamodb/) store and serve podcast data through lightweight serverless functions.
- [AWS CDK](https://aws.amazon.com/cdk/) defines repeatable cloud infrastructure for the web, API, and supporting services.
- [Vitest](https://vitest.dev/), [ESLint](https://eslint.org/), and [Prettier](https://prettier.io/) keep the codebase tested, linted, and consistently formatted.
- [Ink](https://github.com/vadimdemedes/ink) powers a keyboard-first terminal UI for the same podcast workflows as the web app.

## CLI (Terminal UI)

The repo now includes a first-class CLI app in `apps/cli` with GraphQL feature parity:

- Profile stats + library browsing
- Global podcast search with subscribe/unsubscribe
- Show detail + episode pagination
- Episode progress actions (single, next, all)
- Show rating/review and drop/unsubscribe actions
- OAuth login (Cognito Authorization Code + PKCE)

### Required environment variables

- `PODCAST_TRACKER_APPSYNC_URL`
- `PODCAST_TRACKER_COGNITO_DOMAIN`
- `PODCAST_TRACKER_COGNITO_CLIENT_ID`
- `PODCAST_TRACKER_COGNITO_REDIRECT_URI` (default `http://127.0.0.1:54545/callback`)
- `PODCAST_TRACKER_COGNITO_LOGOUT_URI` (default `http://127.0.0.1:54545/logout`)

### Commands

```bash
npm run cli:dev
npm run cli:build
npm run cli:start
npm run cli:test
```

Direct usage:

```bash
podcast-tracker auth login
podcast-tracker auth status
podcast-tracker auth logout
podcast-tracker
```

### Keybindings

- Global: `/` search, `?` help, `q` back/quit
- Lists: `j/k` move, `Enter` open/select
- Home: `s` sort, `f` filter, `n` mark next, `u` unsubscribe
- Show: `Enter` toggle episode progress, `n` mark next, `a` mark all, `s` subscribe toggle, `d` drop, `t` rate, `o` open URL, `]` load more episodes

Below are a few interface captures from the latest build. They highlight the profile dashboard, podcast search flow, listening library, and show detail experience.

![Profile dashboard and podcast search](docs/assets/app-dashboard-search.png)
![Library overview and show detail](docs/assets/app-library-show.png)

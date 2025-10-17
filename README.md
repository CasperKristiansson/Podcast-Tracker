![Podcast Tracker preview](docs/assets/podcast-tracker-preview.jpg)

# Podcast Tracker

Podcast Tracker keeps tabs on every show you follow by syncing with the Spotify catalog so new releases surface automatically. A dedicated episode page highlights the latest drops and gives you quick context before you press play. Each show has its own page with rich details, letting you decide what deserves a spot in your queue. Your personal profile page remembers listening history and makes it easy to pick up where you left off while discovering fresh episodes.

## Technologies

- Astro and TypeScript drive the web app, with Tailwind CSS handling responsive styling.
- GraphQL powers the API, with Apollo Client and GraphQL Code Generator managing strongly typed queries.
- AWS Lambda and DynamoDB store and serve podcast data through lightweight serverless functions.
- AWS CDK defines repeatable cloud infrastructure for the web, API, and supporting services.
- Vitest, ESLint, and Prettier keep the codebase tested, linted, and consistently formatted.

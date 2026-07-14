# Edge runtime

This directory is the Astro SSR replacement for the Hugo deployment path.
Git remains the canonical content store; D1 is a runtime projection used by the
Worker to render pages immediately after a content commit.

## Content flow

1. The author editor writes Markdown to GitHub.
2. GitHub calls `POST /api/content-webhook` with a signed push event.
3. The Worker fetches changed Markdown blobs and updates D1.
4. Astro renders the affected route from D1. No site build is required.

The webhook is intentionally incremental and accepts at most three changed
content sources per delivery so it stays below the Workers Free D1 query limit.
Use the seed CLI for the initial import, projector-version changes, or bulk
content edits.

## Local verification

```sh
npm install
npm test
npm run build
npm run db:seed:local
```

`npm run db:seed:sql` validates the repository contract before producing SQL:
275 sources, 371 documents, 349 searchable documents, 371 canonical routes,
and 44 aliases.

## Cloudflare bindings

`wrangler.jsonc` declares the `DB` D1 database and `MEDIA` R2 bucket. The Worker
also needs these secrets and settings:

- `GITHUB_TOKEN`
- `GITHUB_WEBHOOK_SECRET`
- `CF_ACCESS_DOMAIN`
- `CF_ACCESS_AUD`
- `AUTHOR_EMAIL`
- `ARE_NA_API_KEY_RW` or `ARENA_ACCESS_TOKEN` when Are.na sync is enabled

After provisioning D1, replace its placeholder ID in `wrangler.jsonc`, then run
`npm run db:seed:remote` once. Content-only commits must be excluded from Worker
build watch paths; the webhook is responsible for those updates.

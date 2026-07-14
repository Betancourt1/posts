# Edge runtime

This directory is the Astro SSR replacement for the Hugo deployment path.
Git remains the canonical content store; D1 is a runtime projection used by the
Worker to render pages immediately after a content commit.

## Content flow

1. The author editor writes Markdown to GitHub.
2. The editor reads the committed file back from GitHub and projects it to D1.
3. GitHub also calls `POST /api/content-webhook` with a signed push event so
   commits made outside the editor reach D1.
4. Astro renders the affected route from D1. No site build is required.

The editor keeps the existing save contract: GitHub first, optional Are.na
sync second, then an immediate notebook redirect. It never waits for a
Cloudflare deployment. Deletion may still verify the public 404.

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
npm run media:sync:local
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
the initial projection and media import:

```sh
npm run db:seed:remote
npm run media:sync:dry-run
npm run media:sync
npm run deploy
```

`media:sync` copies the existing `static/uploads/` objects to R2 without
changing their public `/uploads/...` URLs. New editor uploads go directly to
R2. Content-only commits must be excluded from Worker build watch paths; D1
projection is responsible for those updates.

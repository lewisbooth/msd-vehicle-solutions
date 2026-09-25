# Moorland Self Drive

Static React and Tailwind public site and separate admin bundle, backed by a
Cloudflare Worker for `/api`, D1 for vehicle records, and R2 for vehicle images.
The legacy Express/Pug/Mongo CMS and its session data are not part of this app.
Only pages and vehicles **currently visible on moorlandselfdrive.co.uk** are in
scope. The old backup and historical vehicles are excluded.

## Local build

Requires Node.js 22 or newer.

```sh
npm ci
npm run build
```

The build creates `dist/`: prerendered HTML for brochure pages, listings and
vehicle details; hashed frontend bundles, graphics and fonts; and a sitemap.
The build generates a shared image URL map in `.generated/` before bundling, so
the static HTML and hydrated React app reference the same versioned images.
It uses `src/content/vehicles.json` as the checked-in
snapshot of the visible live catalogue. The snapshot is reviewed and updated
from the current site before a build; admin changes to D1 require a new static
build before their detail pages and SEO metadata are published. `npm run dev`
starts the public Vite development server.
Run `npx wrangler dev` after building to exercise the Cloudflare assets and API
locally with configured D1 and R2 bindings.

`wrangler.jsonc` routes `/api` and `/api/*` to the Worker script. Matched public
HTML and assets are served by Cloudflare Static Assets without executing it.
Hashed build assets, including site images, fonts and favicon, are served with a
one-year `immutable` browser cache; their URL changes when their bytes change.
HTML revalidates, while robots and verification files keep their stable URLs.
The 30 current public vehicle photos use content-hashed R2 keys and immutable
cache headers. The production bucket has its own `r2.dev` hostname during this
Workers deployment. That hostname supports browser caching but not Cloudflare
edge caching; change `MEDIA_BASE_URL` and republish the reviewed static snapshot
to use a custom R2 domain after the Cloudflare DNS zone is ready.

## Migration and deployment

See [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for the live-only inclusion list,
requirements, phased tasks, acceptance checks and progress log. That file
records the Western Europe production import and remaining DNS/integration checks.
Historical backup data and generated import output must stay out of Git and
Cloudflare.

The production `main` branch uses the Western Europe D1 database and R2 bucket.
Workers Builds uses Build `npm run build` and Deploy `npm run deploy:production`.
The deploy script verifies the production binding and media origin, applies
pending remote D1 migrations, then publishes the Worker and Static Assets. The
build token needs permission to apply D1 migrations. Validate the configured
target without a Cloudflare request using `npm run migrate:production -- --check`.
Public photos from R2 bypass the site Worker.

This repository now has only production D1/R2 bindings. Preview Builds is
disabled in Cloudflare Branch control. One old `main` Worker Preview still
serves a stale page on its separate URL and needs deletion by the account
owner; the data-only token used for the import lacks permission to remove it.
`npm run deploy:production` checks its fixed D1 ID and R2 bucket before applying
migrations. The public domain still
points to the old host; the Worker can be tested on its `workers.dev` hostname.

After admin edits, use the scoped [D1 publishing procedure](scripts/publish-d1.md)
to review an export, refresh the tracked static snapshot and rebuild pages.

# Moorland Self Drive

Worker-rendered public pages with Tailwind CSS and small browser interactions,
plus a separate React/Tailwind admin bundle. The Worker reads D1 for current
vehicle data and serves `/api`; vehicle photos load directly from R2.
The legacy Express/Pug/Mongo CMS and its session data are not part of this app.
The initial import includes only pages and vehicles visible on
**moorlandselfdrive.co.uk** during the migration. The old backup and historical
vehicles are excluded.

## Local build

Requires Node.js 22 or newer.

```sh
npm ci
npm run build
```

The build creates `dist/` with fingerprinted public CSS and focused browser
JavaScript, the separate admin React bundle, graphics and fonts. The Worker
uses React JSX as a server-only template to render public HTML from current D1
rows; the sitemap is generated from D1 too. No vehicle pages are built ahead
of time, and no public React or serialized catalogue reaches the browser.
Listing filters use GET query parameters and arrive already applied in the
initial HTML. Small JavaScript handles menu, gallery,
quote and contact interactions. Brochure and legal copy is tracked in the
repository. `src/content/featured.json` retains the original preferred card
order among equally promoted D1 records, subject to current visibility; `src/content/vehicles.json` is an
unused migration reference, not live public data.

Use `npm run dev` to build the assets and start Wrangler locally, or run
`npx wrangler dev` after an existing build. Both exercise the Worker, Cloudflare
assets and local D1/R2 bindings. Local D1 must contain the records you intend
to view.

`wrangler.jsonc` routes public HTML, `/sitemap.xml`, and `/api` to the Worker;
matched CSS, JavaScript, graphics, fonts and admin assets are served directly
as Cloudflare Static Assets. Dynamic public HTML uses `Cache-Control: no-store`
so a successful admin edit appears on the next page request without a build.
Fingerprint-based assets, including site images, fonts and favicon, use a
one-year `immutable` browser cache; their URLs change when their bytes change.
The admin HTML, robots file and verification files keep their stable URLs.
The 30 current public vehicle photos use content-hashed R2 keys and immutable
cache headers. The production bucket has its own `r2.dev` hostname during this
Workers deployment. That hostname supports browser caching but not Cloudflare
edge caching. Change `MEDIA_BASE_URL` and redeploy the Worker to use a custom
R2 domain after the Cloudflare DNS zone is ready; the D1 photo keys remain the
same.

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
disabled in Cloudflare Branch control, and the old Worker Previews and their
data resources have been deleted.
`npm run deploy:production` checks its fixed D1 ID and R2 bucket before applying
migrations. The public domain still
points to the old host; the Worker can be tested on its `workers.dev` hostname.

Admin edits write D1 immediately, and the next public HTML request reads the
new rows. The retired [snapshot export procedure](scripts/publish-d1.md) remains
available for optional inventory audits; it is not needed to publish edits.
Cloudflare Access is not yet configured, so admin editing currently fails
closed. Contact delivery likewise requires a verified email binding before
submissions can succeed.

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
vehicle details; hashed frontend bundles; a sitemap; and copied, tracked site
graphics and fonts. It uses `src/content/vehicles.json` as the checked-in
snapshot of the visible live catalogue. The snapshot is reviewed and updated
from the current site before a build; admin changes to D1 require a new static
build before their detail pages and SEO metadata are published. `npm run dev`
starts the public Vite development server.
Run `npx wrangler dev` after building to exercise the Cloudflare assets and API
locally with configured D1 and R2 bindings.

`wrangler.jsonc` routes `/api` and `/api/*` to the Worker script. Matched public
HTML and assets are served by Cloudflare Static Assets without executing it.
Hashed build assets are immutable; HTML revalidates. Current public photos are
being transferred to R2, which will use its own public hostname once configured.

## Migration and deployment

See [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for the live-only inclusion list,
requirements, phased tasks, acceptance checks and progress log. That file
records which D1/R2 transfers and Cloudflare preview checks are still pending.
Historical backup data and generated import output must stay out of Git and
Cloudflare.

The production branch and preview branches are connected to Cloudflare Workers
Builds. Keep preview D1/R2 separate from production before enabling admin
writes; apply D1 schema migrations before deploying API code that needs them.

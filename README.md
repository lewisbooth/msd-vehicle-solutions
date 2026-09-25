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
Hashed build assets are immutable; HTML revalidates. The 30 current public
photos have been copied to isolated preview R2; production requires its own
public media hostname and a separate import before cutover.

## Migration and deployment

See [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for the live-only inclusion list,
requirements, phased tasks, acceptance checks and progress log. That file
records completed preview transfers and the remaining Cloudflare checks.
Historical backup data and generated import output must stay out of Git and
Cloudflare.

The production branch and preview branches are connected to Cloudflare Workers
Builds. `wrangler.jsonc` binds Worker Previews to a separate D1 database and R2
bucket. Its `previews.vars.MEDIA_BASE_URL` points at the preview bucket's public
`r2.dev` testing URL; production still needs its own R2 custom domain. Public
vehicle photos at that origin bypass the site Worker.

For branch builds, set the Workers Builds build command to `npm run build` and
the Preview command to `npm run deploy:preview`. That command checks the tracked
`wrangler.preview-migrations.jsonc` against both Worker D1 bindings, refuses a
production D1 target, applies pending preview migrations, and only then invokes
`wrangler preview`. The build token needs D1 edit access. The remote Preview
command currently remains `npx wrangler preview`; update it in the Cloudflare
Workers Builds settings before relying on CI migrations. Validate the local
target without remote writes using `node scripts/migrate-preview.mjs --check`.
Keep the production deploy command under separate cutover control.

After admin edits, use the scoped [D1 publishing procedure](scripts/publish-d1.md)
to review an export, refresh the tracked static snapshot and rebuild pages.

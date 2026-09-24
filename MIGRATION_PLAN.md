# Cloudflare migration: requirements, phases, and progress

This is the tracked implementation record for moving Moorland Self Drive from Express/Pug/Mongo to Cloudflare Static Assets, an `/api` Worker, D1 and R2. Update checkboxes and append dated progress as work happens.

**Source of truth:** the pages, listings, records and photos currently visible at `moorlandselfdrive.co.uk`. The supplied backup is out of scope. Do not copy its documents, media, users, sessions or generated import files into this project or Cloudflare.

## Requirements and acceptance criteria

- [x] Retain current public brochure/legal pages, three listing types and only vehicle detail URLs visibly linked by the live site. Include the two sold cards currently visible in the sales listing, with sold badges.
- [x] Generate crawlable HTML for each retained route with route titles, descriptions, canonical links, sitemap, robots and a real static 404. Drop old pages and media no longer live.
- [x] Build static React/Tailwind public pages with a committed snapshot of current visible catalogue data. Refresh changing content via `/api` with minimal layout shifts; quote widget stays client side.
- [x] Supply a separate static React/Tailwind admin bundle at `/admin/` for vehicle CRUD, ordered photos, availability, prices and sold status, without the old CMS, Passport, Mongo or session dependency.
- [x] Serve HTML, JS, CSS and fixed graphics as Cloudflare Static Assets. Hash bundles and cache them immutably; revalidate HTML. Only `/api` and `/api/*` enter Worker code during normal matched/static navigation.
- [ ] Use D1 for **current live** vehicle records and R2 for **currently displayed** vehicle photos under immutable keys. Serve public images directly from an R2 public host when available.
- [ ] Protect admin APIs using Cloudflare Access JWT, and configure verified contact email delivery. Integrations fail closed until configured.
- [ ] Automatically build branch previews, apply schema migrations before deploying dependent API code, isolate preview D1/R2, and provide a publishing rebuild that refreshes static HTML from D1 after admin changes.
- [ ] Verify preview routes, current inventory and photos, sold state, direct navigation, admin auth, contact delivery, cache headers, Worker routing and rollback before production cutover.

## Architecture decisions

One Worker project deploys `dist` Static Assets and a small `worker/index.ts`. `assets.run_worker_first` selects only `/api` and `/api/*`; brochure, listing and current vehicle pages are generated as HTML files. `404-page` returns a real 404 on missing static routes. Matched static requests bypass the script; unmatched non-navigation requests may still enter its 404 handler.

Public APIs: `GET /api/home`, `GET /api/vehicles?type=...`, `GET /api/vehicles/:slug`, `POST /api/contact`; admin APIs: `/api/admin/*`. The public snapshot and D1 must come from **current live content only**. Admin edits update D1 immediately but need a reviewed snapshot export/build to update SEO HTML or publish a new detail URL.

Workers Builds currently targets `master` for production and supports branch previews. The implementation branch is `feat/cloudflare-migration`. Rename `master` to `main` after preview validation and after updating Cloudflare's production branch. Existing production D1/R2 are empty; separate preview D1/R2 and a public R2 media host are still needed.

## Current live vehicle inclusion list

Observed directly from the three public listing pages and each vehicle detail page on 2026-09-24: **6 hire, 8 sales (including 2 visibly sold), 1 lease; 15 distinct records**. Vehicle IDs and image tokens below come from their currently displayed image URLs. Recheck before production cutover; exclude any historical record not linked from a current listing.

| Listing | Live vehicle ID | Exact slug | Photo token | Sold |
|---|---|---|---|---|
| hire | `5ad07716052a88af8f2dbd2a` | `volkswagen-caddy-highline-2020` | `1523611430188` | No |
| hire | `5ad083b1052a88af8f2dbd2b` | `volkswagen-transporter-2022` | `1523623875811` | No |
| hire | `5ad0b6c44efc60b766567e1a` | `ford-tourneo-9-seater-minibus-2021` | `1523627715821` | No |
| hire | `5ad0b6fb4efc60b766567e1b` | `mercedes-sprinter-panel-van-2021` | `1523627770876` | No |
| hire | `5ad0b4934efc60b766567e19` | `mercedes-sprinter-luton-with-tail-lift-2019` | `1523627155038` | No |
| hire | `5ad0b72f4efc60b766567e1c` | `mercedes-sprinter-dropsideflatbed-2021` | `1523627823291` | No |
| sales | `68ff33c79ef522157f9db472` | `share-2023-land-rover-defender-3.0-d250-110-hard-top-commercial-auto-panel-van-2023` | `1761555430022` | Yes |
| sales | `68ff35069ef522157f9db4e0` | `2023-renault-trafic-sl30-blue-dci-130-extra-van-panel-van-diesel-manual-2023` | `1761555785434` | Yes |
| sales | `6a4675d8fa8b832810dbafed` | `2021-mercedes-benz-citan-109cdi-pure-van-2021` | `1783002624390` | No |
| sales | `6a3b8becfa8b832810dba135` | `2019-ford-fiesta-1.5-tdci-van-2019` | `1782287388613` | No |
| sales | `6a21316bfa8b832810db807c` | `2024-vauxhall-movano-2.2-turbo-d-140ps-h2-van-prime-panel-van-diesel-manual-2024` | `1780560264300` | No |
| sales | `6a2131f0fa8b832810db80aa` | `2024-vauxhall-vivaro-2.0-turbo-d-145-pro-h1-van-panel-van-diesel-manual-2024` | `1780560444956` | No |
| sales | `6a23dca0fa8b832810db84ca` | `2024-renault-master-lm35-blue-dci-145-start-medium-roof-van-2024` | `1780735166874` | No |
| sales | `674d97505ebb0c36189fea6e` | `2023-(72)-ford-transit-tipper-350-leader-ecoblue-2023` | `1733138368700` | No |
| lease | `5ad0abc1814627b74cf2285f` | `ford-ranger-wildtrak-2018` | `1523624897138` | No |

## Phases

### 0. Audit current public site

- [x] Inspect repository, live brochure routes and current listings.
- [x] Create implementation branch and tracked requirements/progress record.
- [x] Enumerate visible vehicle links across hire/sales/lease and check each live detail/photo; record exact inclusion list.
- [ ] Record DNS/mail records and redirect/canonical expectations before cutover.

### 1. Static site, Worker and live-only content

- [x] Build React/Tailwind public and admin bundles, route-specific prerender, D1 schema and `/api` Worker.
- [x] Configure Static Assets routing, hashed cache headers and local migration; pass `wrangler deploy --dry-run`.
- [x] Remove the old Express/Pug/Mongo CMS and unused tracked assets; preserve current graphics and legal copy.
- [x] Replace the discarded backup-derived snapshot with records from current live pages only; rebuild and verify generated routes.
- [x] Add a repeatable live-content-to-D1/R2 process using verified current pages and photos with an inclusion report; remote writes remain gated.

### 2. Preview and data

- [x] Publish `feat/cloudflare-migration`; Cloudflare created an automatic preview build from the branch push.
- [x] Verify the automatic preview build succeeds and inspect its public URL, routes and API behaviour.
- [ ] Provision separate preview D1/R2 and configure preview bindings/migration config.
- [ ] Apply preview schema and transfer only current live records/photos; compare against live pages.
- [ ] Configure preview Access and email; test admin/contact, static/API routes and headers.
- [x] Add an admin publishing rebuild that exports current D1 to a reviewed snapshot before rebuilding static pages; remote rehearsal awaits preview D1 access.

### 3. Production readiness and cutover

- [ ] Configure guarded CI migrations with D1 permissions before deployments, and test rollback.
- [ ] Rename `master` to `main`, update Cloudflare production branch, then merge the reviewed migration.
- [ ] Recheck live content immediately before cutover, sync changes and switch DNS/media domains while preserving mail records.
- [ ] Set up D1 exports and R2/offsite backups; rehearse restore.

## Progress log

- **2026-09-24:** Audited the public site and 2022 repo, created `feat/cloudflare-migration` at `8de872e`.
- **2026-09-24:** Built React/Tailwind public/admin bundles, Worker API, D1 schema, static 404, sitemap and hashed cache headers. Build and Worker dry-run pass. Local API checks use synthetic records.
- **2026-09-24:** Removed legacy server/CMS code and obsolete repo media; retained current shared graphics, fonts and legal copy.
- **2026-09-24:** User excluded the supplied backup and all archived data. Removed the offline archive importer and its generated local SQL/media/snapshot; collecting a replacement snapshot directly from the live site.
- **2026-09-24:** Direct inspection shows six hire, eight sales (two sold), one lease: 15 distinct vehicle links and corresponding live detail/photo pages. Exact IDs/slugs/photo tokens are recorded above. The old backup is excluded; only the live site determines what to keep.
- **2026-09-24:** Replaced the public snapshot and legal text from current live pages. Rebuilt 28 public HTML pages (15 live detail routes), 6/8/1 listing cards, a 27-URL sitemap and the separate admin bundle. The two currently displayed sold sales cards retain sold badges. `src/content/README.md` documents inferred defaults for fields the public site does not expose.
- **2026-09-24:** Independently downloaded and decoded 30 currently displayed 400/1000 JPEGs (2,309,370 bytes); verified source URLs, dimensions and SHA-256. Live-only scripts generated/replayed D1 SQL for 15 records, staged 30 content-hashed R2 objects and an update SQL. The uploader's dry run matched the independent photo audit. No Cloudflare data was written.
- **2026-09-24:** Published the implementation commit to GitHub branch `feat/cloudflare-migration`. Cloudflare automatically created a queued preview build for commit `48bdfd87`; deployment verification remains pending.
- **2026-09-24:** Connected Cloudflare can read empty production D1/R2 but creation of preview resources returns authentication error `10000`. Wrangler CLI is unauthenticated; no remote data changed.
- **2026-09-24:** Automatic branch preview build `bc4df393-f1e6-4ed0-b14c-04e8f35e22e7` succeeded for commit `fa573bd`; preview URL: `https://feat-cloudflare-migration-msd-vehicle-solutions.lewisbooth.workers.dev/`. Inspected the rendered hire/sales/lease listings (6/8/1 cards, including two sold), a direct vehicle detail, and the separate admin UI. HTTP checks confirmed normal HTML and sitemap `200`, missing page `404`, hashed JS/CSS `max-age=31536000, immutable`, HTML revalidation, `/api/home` and `/api/admin/me` `503` with `no-store` while preview D1 is absent, and preview `X-Robots-Tag: noindex`. Photos currently resolve from the live Lightsail origin until R2 upload. Found and fixed a sale-only vehicle detail defaulting to the Hire breadcrumb in the subsequent commit.
- **2026-09-24:** Full route audit: all 27 sitemap URLs returned `200`, 15 vehicle slugs and 6/8/1 listing cards matched the live site, and every referenced live photo matched the verified 30-image manifest. First-party static assets/fonts loaded; unknown routes returned `404`. Legacy `/vehicles` uses an HTML meta refresh with a canonical link instead of the former `302` redirect. Fixed sale/lease detail breadcrumbs and related stock, plus three API/admin defects found in review.
- **2026-09-24:** Added `scripts/publish-d1.py` and [review procedure](scripts/publish-d1.md): export a scoped, live public D1 candidate and diff, approve its digest, re-query to detect changes, and rebuild tracked static pages. Production publishing rejects remaining Lightsail photos and requires a matching public R2 origin. Synthetic export/apply/auth and UUID-image cases passed. Remote rehearsal is blocked by preview D1 permissions. Sold/removed featured pins now fall back to current stock, so normal admin changes can rebuild.
- **2026-09-24:** Automatic preview build `4741ea01-6bfe-4701-87a3-bceab196183d` succeeded for commit `813b865` at 15:47:49 UTC, uploading the changed HTML and hashed JS. Final preview checks: home/admin/sales listing/direct vehicle returned `200`, an unknown route returned `404`, and `/api/home` returned an expected `503` with no preview DB. Browser confirmed the sale-only Ford Transit page now links back to Sales. `npm run build` includes a Worker TypeScript check and passes; Wrangler dry-run passes. Production is unchanged.

## Open gates

- Cloudflare edit access is needed to provision isolated preview D1/R2 and transfer live data. Never bind writable previews to production resources.
- Cloudflare Access, a verified contact email destination and the site's DNS zone are not configured in the connected account. Admin writes and form delivery fail closed.
- Live photo URLs can be used temporarily on the preview; production needs only currently displayed photos in R2 and a public media origin.
- New D1 vehicles lack static `/vehicles/:slug` HTML until a publishing rebuild; edits can leave SEO HTML stale. Add the publish workflow before production use.
- Filtered listing deep links first render the canonical static listing; hydration applies filters later. Card image sizes are reserved, but card positions may change.
- The legacy `/vehicles` bookmark uses a static meta refresh rather than the former HTTP `302`, to keep non-API navigation on Static Assets.

# Review and publish D1 inventory as static HTML

Admin changes update D1 immediately. Crawlers and first visits need a matching
tracked catalogue snapshot for route-specific HTML. The publisher exports only
undeleted vehicles with at least one public availability flag, including sold
sales cards. It requires ordered photos for every exported vehicle. It never
reads a legacy data source or writes to D1.

## Production publishing

Use `--scope production` deliberately; it checks the fixed Western Europe D1
ID and selects only the production `DB` binding in `wrangler.jsonc`:

```sh
python3 scripts/publish-d1.py export --scope production \
  --media-base-url https://pub-f23343a6d1d74aca9ae43823407d11da.r2.dev
python3 scripts/publish-d1.py apply --scope production \
  --media-base-url https://pub-f23343a6d1d74aca9ae43823407d11da.r2.dev \
  --approve-sha256 THE_REVIEWED_SHA256
```

Review `data/publish-production.json` and its report for **added, removed and
changed slugs**, pricing, sold state and photo URLs. A removed slug removes
its static detail page on the next build. Copy the report's exact
`candidateSha256` into `apply`; it re-reads production D1 and rejects changed
data or a changed tracked baseline before replacing `src/content/vehicles.json`
and running `npm run build`. It restores the old snapshot if the build fails.
Review the Git diff, then commit on `main` for an automatic production build.
Production publication **rejects every external image URL** and
requires immutable R2 keys plus a matching public media origin before the
old server can be retired. By default it HEAD-checks every public 400px and 1000px
URL for HTTP 200 and `image/jpeg`, refusing redirects, missing images and empty
responses.

If a restricted shell proxy returns HTTP 403 for public `r2.dev` HEAD requests,
the initial live-only production import can use `--verify-r2-remote` on **both**
`export` and `apply`. This flag reads each production R2 object through Wrangler
and compares its exact byte length and SHA-256 with the independent, ignored
`data/live-r2-manifest.json`; it refuses any missing or extra manifest keys
relative to the 15 vehicles/30 photos in production D1. It checks the manifest's
source URL and expected immutable JPEG cache metadata. Wrangler object-get
does **not** return the stored `Content-Type` or `Cache-Control`, and this flag
cannot establish public HTTP reachability or a Cloudflare edge cache hit.
Confirm those separately in a browser or another network. The default remains
the direct public HTTP HEAD check.

```sh
python3 scripts/publish-d1.py export --scope production \
  --media-base-url https://YOUR-PRODUCTION-R2-HOST --verify-r2-remote
python3 scripts/publish-d1.py apply --scope production \
  --media-base-url https://YOUR-PRODUCTION-R2-HOST --verify-r2-remote \
  --approve-sha256 THE_REVIEWED_SHA256
```

The review report records the verification mode and `apply` refuses a different
mode. This fallback is scoped to the initial 30 audited live photos; after
future admin additions or media changes, use direct public HTTP verification
or update and independently audit the media manifest first.

When D1 images use immutable R2 keys, supply the **public HTTPS media origin**
to both commands, and set the matching runtime `MEDIA_BASE_URL` in the selected
Worker config. The script refuses to emit `/api/media` images in static HTML or
publish a media host different from the Worker runtime. The current production
`r2.dev` host bypasses the site Worker but does not provide Cloudflare edge
caching. Replace this host in `wrangler.jsonc` and publish a new static snapshot
when the Cloudflare zone and custom R2 domain are available. Browser caching
remains immutable while the content-hashed image keys stay the same.

If Cloudflare read access is unavailable, export fails before producing a
candidate. Neither export nor apply writes remote D1/R2; publishing happens
through the reviewed `main` commit and its CI build.

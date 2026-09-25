# Retired snapshot publishing procedure

Public HTML and the sitemap now read current D1 records in the Worker on each
request. Admin changes appear on the next public HTML request. **Do not run this
procedure to publish normal inventory edits.** `src/content/vehicles.json` is
the migration baseline, not a public build input.

`scripts/publish-d1.py` remains available for an optional, read-only inventory
audit. Its `export` command reads the production D1 database, checks photo
URLs, and writes an ignored candidate and comparison report under `data/`.
It does not modify remote D1/R2 or any public page. The legacy export selection
can differ from the current Worker visibility rules for unusual sold vehicles,
so check the live pages when auditing what visitors can actually see.

## Optional production audit

`--scope production` checks the fixed Western Europe D1 ID and selects only
the production `DB` binding in `wrangler.jsonc`. Supply the public HTTPS media
origin currently configured as `MEDIA_BASE_URL`:

```sh
python3 scripts/publish-d1.py export --scope production \
  --media-base-url https://pub-f23343a6d1d74aca9ae43823407d11da.r2.dev
```

Inspect `data/publish-production.json` and
`data/publish-production-report.json` for added, removed and changed slugs,
prices, sold state and photo URLs. The default verification HEAD-checks all
public 400px and 1000px JPEGs for HTTP 200 and the expected content type; it
rejects redirects and missing or empty images.

If an environment blocks public `r2.dev` HEAD requests, the optional
`--verify-r2-remote` flag reads and SHA-256-checks R2 objects through Wrangler
against the ignored `data/live-r2-manifest.json`. This fallback covers **only**
the original audited 15 vehicles/30 photos, not later admin changes. It does
not verify the public hostname, HTTP content type or edge caching. Confirm
those separately before treating the images as publicly available.

For an explicit historical reference update, `apply` accepts the reviewed
report's `candidateSha256` as `--approve-sha256`, rechecks unchanged D1 data,
then replaces `src/content/vehicles.json` and runs `npm run build`:

```sh
python3 scripts/publish-d1.py apply --scope production \
  --media-base-url https://pub-f23343a6d1d74aca9ae43823407d11da.r2.dev \
  --approve-sha256 THE_REVIEWED_SHA256
```

Run `export` and `apply` with the same media verification flag when using
`--verify-r2-remote`. Applying changes only the tracked historical reference;
it neither writes remote D1/R2 nor changes Worker-rendered vehicle pages. Review
the Git diff before committing a provenance update. After the custom R2 domain
is configured, use its matching `MEDIA_BASE_URL` in these commands instead of
the temporary `r2.dev` origin.

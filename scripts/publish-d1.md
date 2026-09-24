# Review and publish D1 inventory as static HTML

Admin changes update D1 immediately. Crawlers and first visits need a matching
tracked catalogue snapshot for route-specific HTML. The publisher exports only
undeleted vehicles with at least one public availability flag, including sold
sales cards. It requires ordered photos for every exported vehicle. It never
reads a legacy data source or writes to D1.

## Preview branch

Provision an isolated preview D1, copy
`wrangler.preview-migrations.example.jsonc` to ignored
`wrangler.preview-migrations.jsonc`, and set its `PREVIEW_DB.database_id`.
Configure the **same ID** as the Worker preview `DB` binding in `wrangler.jsonc`.
Authenticate Wrangler with read access to that database. The publisher refuses
to proceed if the preview ID equals production or either binding is absent.

```sh
python3 scripts/publish-d1.py export --scope preview
```

This writes ignored `data/publish-preview.json` and
`data/publish-preview-report.json`. Read the candidate and its **added,
removed and changed slugs**. Verify newly added vehicle details, sale/hire
flags, prices, sold labels, photos and public URLs. A removal deletes a static
detail page on the next build; resolve accidental removals before approving.
Copy the report's exact `candidateSha256` into the next command:

```sh
python3 scripts/publish-d1.py apply --scope preview --approve-sha256 THE_REVIEWED_SHA256
git diff -- src/content/vehicles.json
```

`apply` re-reads the same remote D1 and refuses stale or modified candidates,
then replaces the tracked `src/content/vehicles.json` and runs `npm run build`.
It restores the previous tracked snapshot if the build fails. Review the Git
diff and generated routes before committing on the preview branch; the Git
connected Cloudflare build will then deploy that branch.

## Production

Use `--scope production` deliberately; it selects only the production `DB`
binding in `wrangler.jsonc`. It never falls back to preview or a local DB:

```sh
python3 scripts/publish-d1.py export --scope production --media-base-url https://YOUR-PUBLIC-R2-ORIGIN
python3 scripts/publish-d1.py apply --scope production \
  --media-base-url https://YOUR-PUBLIC-R2-ORIGIN --approve-sha256 THE_REVIEWED_SHA256
```

Review the production candidate separately before applying, and publish its
commit through the controlled production Git branch. Do not replace production
content with a preview candidate. Both scopes independently check the tracked
snapshot's baseline hash, database identity, image row mapping and new D1 state.
Production publication **rejects every remaining Lightsail image URL** and
requires immutable R2 keys plus a matching public media origin before the
old server can be retired. It also HEAD-checks every public 400px and 1000px
URL for HTTP 200 and `image/jpeg`, refusing redirects, missing images and empty
responses. Preview may temporarily retain live-site image URLs.

When D1 images use immutable R2 keys, supply the **public HTTPS media origin**
to both commands, and set the matching runtime `MEDIA_BASE_URL` in the selected
Worker config. The script refuses to emit `/api/media` images in static HTML or
publish a media host different from the Worker runtime:

```sh
python3 scripts/publish-d1.py export --scope preview --media-base-url https://PREVIEW-MEDIA-ORIGIN
python3 scripts/publish-d1.py apply --scope preview \
  --media-base-url https://PREVIEW-MEDIA-ORIGIN --approve-sha256 THE_REVIEWED_SHA256
```

The current preview D1 binding and Cloudflare write access are unconfigured;
these commands correctly fail before producing a candidate until provisioned.
No remote mutation occurs during export or apply; publishing happens via a
reviewed Git commit and its CI build.

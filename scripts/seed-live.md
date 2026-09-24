# Curated live inventory seed

`src/content/vehicles.json` contains the 15 vehicles linked from the current
public hire, sales and lease listings. To validate it and prepare a reviewable
local D1 seed, run from the repository root:

```sh
python3 scripts/seed-live.py
```

This writes ignored `data/live-vehicles.sql`, `data/live-photo-manifest.json`
and `data/live-seed-report.json`. Python 3.10+ and the standard library suffice.
The seed preserves all 15 IDs and slugs, current visible prices and sold flags,
and the two currently sold sales cards. The three listings without a displayed
price are recorded in the report. `createdAt` and `updatedAt` in the curated
snapshot are observation dates; the original CMS timestamps are unknown.

The two image key columns initially hold strictly validated **live-site HTTPS
URLs**. The API returns those URLs unchanged. The manifest records all 30
current 400/1000 source URLs for an eventual R2 copy. No file is downloaded or
claimed as migrated by this script; image widths/heights are unknown until
the live files can be read. Keep direct live URL reads on preview until R2 is
ready.

## Preview D1 schema and records

Remote preview writes require a **separate preview D1 ID** in a local config
copied from `wrangler.preview-migrations.example.jsonc`. That file is ignored by
Git. Confirm the ID and name identify the isolated preview before applying the
schema, then seed the 15 live records:

```sh
npx wrangler d1 migrations apply PREVIEW_DB --config wrangler.preview-migrations.jsonc --remote
npx wrangler d1 execute PREVIEW_DB --config wrangler.preview-migrations.jsonc --remote --file data/live-vehicles.sql
npx wrangler d1 execute PREVIEW_DB --config wrangler.preview-migrations.jsonc --remote --command 'SELECT COUNT(*) AS n FROM vehicles;'
```

Replay the seed only before admin edits: it upserts the 15 reviewed rows and
replaces their photo rows. A replay after admin edits would overwrite them.
Connected Cloudflare resource creation and writes currently fail with
authentication error `10000`; these are preparatory commands.

## Live images to R2

Use a cache populated from the 30 currently displayed URLs, mirrored as
`<cache>/vehicles/<id>/<token>-{400,1000}.jpg`. The independent live download
audit `../live-media/manifest.json` is detected automatically when using that
cache. Pillow is required for a full JPEG pixel decode. The command defaults
to dry run with **no Cloudflare writes**:

```sh
python3 scripts/upload-live-media.py --cache-dir ../live-media --offline
```

If downloading afresh, omit `--cache-dir --offline`: the script permits only
`https://moorlandselfdrive.co.uk/images/vehicles/<id>/<token>-{400,1000}.jpg`
and rejects redirects. Use `--cache-dir` without `--offline` to fill a partially
populated live-image cache. It checks each file's JPEG markers and fully decodes
its pixels, verifies SHA-256, dimensions and byte counts against an audit
manifest when supplied, then stages immutable keys such as
`vehicles/<id>/<token>-400.<sha12>.jpg` in ignored `data/live-r2/`.

The dry run writes ignored `data/live-r2-manifest.json`,
`data/live-r2-update.sql`, `data/live-vehicles-r2.json` and a report. The
replacement snapshot uses `/api/media/` unless `--media-base-url` points to a
working public R2 **HTTPS origin**; use that flag for the final build so image
requests bypass the Worker.

Only after a separate preview bucket and access are provisioned, use the same
verified input to upload 30 objects with Wrangler. It records a per-bucket
local checkpoint, safely replaying uploads of the same content-hashed keys:

```sh
python3 scripts/upload-live-media.py --cache-dir ../live-media --offline \
  --media-base-url https://YOUR-PREVIEW-R2-PUBLIC-ORIGIN \
  --bucket YOUR_PREVIEW_R2_BUCKET --execute
npx wrangler d1 execute PREVIEW_DB --config wrangler.preview-migrations.jsonc --remote --file data/live-r2-update.sql
```

Compare remote photo rows and serve sample media URLs before replacing the
tracked `src/content/vehicles.json` with the reviewed generated
`data/live-vehicles-r2.json`. This final tracked snapshot change triggers
static page regeneration. The SQL changes only those 15 image pairs, and the
script locally applies the original live seed and media update twice to check
its mapping. Never apply the media update before uploading the images.

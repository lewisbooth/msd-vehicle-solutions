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
the live files can be read. Once copied, use the downloaded bytes' SHA-256 to
name immutable R2 objects, validate each image and update only these 15 photo
pairs in D1. Keep direct live URL reads on preview until then.

Remote preview writes require a **separate preview D1 ID** in a local config
copied from `wrangler.preview-migrations.example.jsonc`. That file is ignored by
Git. Check that its ID and database name identify the dedicated preview, then:

```sh
npx wrangler d1 migrations apply PREVIEW_DB --config wrangler.preview-migrations.jsonc --remote
npx wrangler d1 execute PREVIEW_DB --config wrangler.preview-migrations.jsonc --remote --file data/live-vehicles.sql
npx wrangler d1 execute PREVIEW_DB --config wrangler.preview-migrations.jsonc --remote --command 'SELECT COUNT(*) AS n FROM vehicles;'
```

The seed can be replayed before admin edits: it upserts the 15 reviewed rows,
deletes and reinserts their associated photo rows, and locally checks that
applying it twice returns the same state. Replaying it *after* admin edits
would overwrite them. Currently Cloudflare resource creation and remote writes
are blocked by the connected account's authentication error `10000`; the
commands above are preparatory, not a claim that preview data has been sent.

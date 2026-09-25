# Initial live-only production import

The original import used the **15 vehicles then visible** on the public hire,
sales and lease listings (including two sold sales cards) and their 30 displayed
JPEGs. The backup archive, archived vehicles and other CMS data were excluded.
The independent photo audit recorded source URLs, byte lengths, dimensions and
SHA-256 hashes. The historical `src/content/vehicles.json` baseline contains
production R2 URLs, so do **not** rerun `scripts/seed-live.py` or
`scripts/upload-live-media.py` with that baseline: those preparation scripts
expect the original live-site image URLs and will reject R2 URLs.

The initial import produced ignored `data/live-vehicles.sql` (current vehicle
rows with temporary live-site image URLs), `data/live-r2-update.sql` (the same
15 image pairs replaced with immutable R2 keys), and
`data/live-r2-manifest.json` (the 30 audited JPEGs). Generated SQL and image
files are local migration inputs, never checked into Git. These SQL files were
intended for **a newly migrated empty database only**. Replaying them after
admin edits would overwrite vehicle records and photos.

## Production resources

`wrangler.jsonc` binds `DB` and `MEDIA` to the Western Europe production D1
database and R2 bucket. The production migration command validates the binding
before changing the remote database:

```sh
npm run migrate:production -- --check
npm run migrate:production
```

`scripts/promote-live-media.py` validates the 30 staged JPEGs against the
audited manifest, checks that every key belongs to the tracked public snapshot,
and targets only the production bucket. Its default command is a local dry run;
`--execute` uploads those same immutable keys only for this original 15-vehicle
snapshot or its exact 30-photo restore:

```sh
python3 scripts/promote-live-media.py
python3 scripts/promote-live-media.py --execute
```

For the **initial import into an empty D1 only**, apply the reviewed vehicle
SQL, then the R2 image-key update after the 30 files are present. Check the
target and counts before running either SQL file; never replay this seed as an
ordinary deployment:

```sh
npx wrangler d1 execute DB --config wrangler.jsonc --remote --command 'SELECT COUNT(*) AS n FROM vehicles'
npx wrangler d1 execute DB --config wrangler.jsonc --remote --file data/live-vehicles.sql
npx wrangler d1 execute DB --config wrangler.jsonc --remote --file data/live-r2-update.sql
```

Public HTML now reads current D1 data from the Worker on every request. For
future content changes, edit D1 through the protected admin API; no seed replay,
snapshot export or rebuild is needed for a vehicle edit to appear publicly.
The retired [snapshot export procedure](publish-d1.md) remains available for
optional historical inventory audits.

# Public content provenance

`vehicles.json` records the migration baseline of 15 distinct vehicles visible
in the public hire, sales, and leasing listings at
`https://moorlandselfdrive.co.uk` on 24 September 2026. It is retained for
provenance and optional inventory audits; public Worker pages read current D1
records instead. Editing or exporting this file does not publish vehicle
changes. Each vehicle was inspected on its live detail page. The observed
listing counts were six hire, eight sales (including two marked **SOLD**), and one
lease. The 30 observed photo renditions were copied from the live site to
the Western Europe production R2 bucket under content-hashed keys; photo URLs
in this historical snapshot point to the temporary public `r2.dev` hostname.
The live Worker uses `MEDIA_BASE_URL` to construct photo URLs from D1 R2 keys;
once the custom media domain is available, change that runtime setting and
redeploy. The baseline contains no records recovered from backup archives.

The public site did not expose a vehicle's creation or modification date or
condition field. `createdAt` and `updatedAt` in this snapshot are the
observation date; `condition` uses the application's `used` default. Photo
dimensions were measured from the decoded live JPEGs. These values must not
be represented as historical CMS facts. The original listing order and
promotional labels were observed on the live pages.

`featured.json` records the visible vehicle order on the live hire, sales and
leasing landing pages on the same date; it breaks ties among equally promoted
current D1 vehicles. The Worker checks D1 availability and sold status and
fills vacancies with currently listed stock. Admin promotion ranks first.

`privacy.html` and `terms-and-conditions.html` contain the legal article markup
read from the corresponding live public URLs on the same date. Changes to legal
text should be reviewed by the business before publication.

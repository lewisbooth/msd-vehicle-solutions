# Public content provenance

`vehicles.json` contains the 15 distinct vehicles visible in the public hire,
sales, and leasing listings at `https://moorlandselfdrive.co.uk` on 24 September
2026. Each vehicle was inspected on its live detail page. The observed listing
counts were six hire, eight sales (including two marked **SOLD**), and one
lease. Vehicle photos point to the current live website until those 15 images
are copied from that site to R2. The catalogue contains no records recovered
from backup archives.

The public site did not expose a vehicle's creation or modification date, image
dimensions, or condition field. `createdAt` and `updatedAt` in this snapshot
are the observation date, image `width`/`height` are `null`, and `condition`
uses the application's `used` default. These values must not be represented
as historical CMS facts. The original listing order and promotional labels
were observed on the live pages.

`featured.json` records the visible vehicle order on the live hire, sales and
leasing landing pages on the same date; it is separate from promotion flags.

`privacy.html` and `terms-and-conditions.html` contain the legal article markup
read from the corresponding live public URLs on the same date. Changes to legal
text should be reviewed by the business before publication.

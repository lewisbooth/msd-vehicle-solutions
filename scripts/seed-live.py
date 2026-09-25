#!/usr/bin/env python3
"""Prepare D1 rows for the 15 vehicles displayed by the current public site.

Reads only the curated, tracked live-site snapshot. The image manifest records
the currently displayed *live* URLs; it never reads a backup or local CMS file.
Run from the repository root with Python 3.10+ (standard library only).
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import re
import sqlite3
from urllib.parse import urlsplit


ID = re.compile(r"[0-9a-f]{24}\Z")
TOKEN = re.compile(r"[A-Za-z0-9_-]+\Z")
PHOTO_PATH = re.compile(r"/images/vehicles/([0-9a-f]{24})/([A-Za-z0-9_-]+)-(400|1000)\.jpg\Z")
ISO_UTC = re.compile(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z\Z")
EXPECTED_COUNT = 15
COLUMNS = (
    "id", "slug", "name", "category", "condition", "sold",
    "pricing_hire", "pricing_sales", "pricing_lease",
    "availability_hire", "availability_sales", "availability_lease",
    "promoted_hire", "promoted_sales", "promoted_lease", "description",
    "storage_width", "storage_height", "storage_length", "cargo", "seats",
    "doors", "engine_size", "fuel_type", "fuel_economy", "transmission",
    "height", "mileage", "year", "created_at", "updated_at", "deleted_at",
)


def required_string(value, field):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a nonempty string")
    return value


def boolean(value, field):
    if not isinstance(value, bool):
        raise ValueError(f"{field} must be a boolean")
    return value


def numeric(value, field, *, integer=False):
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value):
        raise ValueError(f"{field} must be numeric or null")
    if integer:
        if int(value) != value:
            raise ValueError(f"{field} must be an integer")
        return int(value)
    return value


def object_field(record, key):
    value = record.get(key)
    if not isinstance(value, dict):
        raise ValueError(f"{key} must be an object")
    return value


def date(value, field):
    if not isinstance(value, str) or not ISO_UTC.fullmatch(value):
        raise ValueError(f"{field} must be an ISO UTC millisecond timestamp")
    dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    return value


def live_photo_url(url, vehicle_id, expected_size):
    if not isinstance(url, str):
        raise ValueError("photo URL must be a string")
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.netloc != "moorlandselfdrive.co.uk" or parsed.query or parsed.fragment:
        raise ValueError(f"photo URL must be current live origin without query or fragment: {url}")
    match = PHOTO_PATH.fullmatch(parsed.path)
    if not match or match.group(1) != vehicle_id or match.group(3) != expected_size:
        raise ValueError(f"photo URL does not match vehicle ID and rendition: {url}")
    if not TOKEN.fullmatch(match.group(2)):
        raise ValueError(f"unsafe photo token in {url}")
    return match.group(2)


def sql_literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return str(int(value))
    if isinstance(value, (float, int)):
        return str(value)
    return "'" + value.replace("'", "''") + "'"


def prepare(source: Path, schema: Path, output_dir: Path):
    source_bytes = source.read_bytes()
    vehicles = json.loads(source_bytes)
    if not isinstance(vehicles, list) or len(vehicles) != EXPECTED_COUNT:
        raise ValueError(f"live inventory must contain exactly {EXPECTED_COUNT} reviewed records")
    rows = []
    images = []
    manifest = []
    ids = set()
    slugs = set()

    for vehicle in vehicles:
        if not isinstance(vehicle, dict):
            raise ValueError("every vehicle must be an object")
        vid = required_string(vehicle.get("id"), "id")
        if not ID.fullmatch(vid) or vid in ids:
            raise ValueError(f"vehicle ID is malformed or duplicated: {vid}")
        ids.add(vid)
        slug = required_string(vehicle.get("slug"), f"{vid}.slug")
        if slug in slugs or "/" in slug or "?" in slug or "#" in slug:
            raise ValueError(f"vehicle slug is duplicated or unsafe: {slug}")
        slugs.add(slug)
        name = required_string(vehicle.get("name"), f"{vid}.name")
        category = required_string(vehicle.get("category"), f"{vid}.category")
        if not re.fullmatch(r"(?:car|van)-[a-z]+", category):
            raise ValueError(f"unexpected vehicle category: {category}")
        condition = vehicle.get("condition")
        if condition not in ("new", "used"):
            raise ValueError(f"invalid condition for {vid}")
        sold = boolean(vehicle.get("sold"), f"{vid}.sold")
        pricing = object_field(vehicle, "pricing")
        availability = object_field(vehicle, "availability")
        promoted = object_field(vehicle, "promoted")
        details = object_field(vehicle, "details")
        storage = object_field(details, "storage")
        prices = {key: numeric(pricing.get(key), f"{vid}.pricing.{key}", integer=True)
                  for key in ("hire", "sales", "lease")}
        avail = {key: boolean(availability.get(key), f"{vid}.availability.{key}")
                 for key in ("hire", "sales", "lease")}
        promo = {key: boolean(promoted.get(key), f"{vid}.promoted.{key}")
                 for key in ("hire", "sales", "lease")}
        # The live sold cards have no displayed price, and the leasing vehicle
        # invites enquiries instead of publishing a figure. Preserve null.
        description = details.get("description")
        if not isinstance(description, str) or re.search(r"<\s*/?\s*[a-z][^>]*>", description, re.I):
            raise ValueError(f"{vid}.details.description must be plain live-site text")
        created = date(vehicle.get("createdAt"), f"{vid}.createdAt")
        updated = date(vehicle.get("updatedAt"), f"{vid}.updatedAt")
        d = lambda key, integer=False: numeric(details.get(key), f"{vid}.details.{key}", integer=integer)
        s = lambda key: numeric(storage.get(key), f"{vid}.details.storage.{key}")
        rows.append((vid, slug, name, category, condition, sold,
                     prices["hire"], prices["sales"], prices["lease"],
                     avail["hire"], avail["sales"], avail["lease"],
                     promo["hire"], promo["sales"], promo["lease"], description,
                     s("width"), s("height"), s("length"), d("cargo"), d("seats", True),
                     d("doors", True), d("engineSize"), details.get("fuelType"),
                     d("fuelEconomy"), details.get("transmission"), d("height"),
                     d("mileage", True), d("year", True), created, updated, None))

        photos = vehicle.get("photos")
        if not isinstance(photos, list) or not photos:
            raise ValueError(f"{vid}.photos must contain currently visible images")
        for index, photo in enumerate(photos):
            if not isinstance(photo, dict) or photo.get("position") != index:
                raise ValueError(f"{vid}.photos must be ordered with consecutive positions")
            small_url, large_url = photo.get("url400"), photo.get("url1000")
            token_small = live_photo_url(small_url, vid, "400")
            token_large = live_photo_url(large_url, vid, "1000")
            if token_small != token_large or photo.get("url") != large_url:
                raise ValueError(f"{vid}.photos[{index}] image tokens or primary URL differ")
            width = numeric(photo.get("width"), "photo.width", integer=True)
            height = numeric(photo.get("height"), "photo.height", integer=True)
            if (width is None) != (height is None) or width is not None and (width <= 0 or height <= 0):
                raise ValueError(f"{vid}.photos[{index}] dimensions incomplete or invalid")
            alt = photo.get("alt")
            if alt is not None and not isinstance(alt, str):
                raise ValueError(f"{vid}.photos[{index}].alt must be text or null")
            images.append((vid, index, small_url, large_url, width, height, alt or name))
            manifest.append({"vehicleId": vid, "slug": slug, "position": index,
                             "token": token_small, "source400": small_url,
                             "source1000": large_url,
                             "mediaInR2": False, "contentHashPendingDownload": True})

    columns = ", ".join(COLUMNS)
    assignments = ", ".join(f"{column}=excluded.{column}" for column in COLUMNS if column != "id")
    statements = ["-- Current live-site snapshot only; 15 reviewed vehicles. Safe to replay before admin edits."]
    for row in rows:
        statements.append(f"INSERT INTO vehicles ({columns}) VALUES ({', '.join(map(sql_literal, row))}) "
                          f"ON CONFLICT(id) DO UPDATE SET {assignments};")
    for vid in [row[0] for row in rows]:
        statements.append(f"DELETE FROM vehicle_images WHERE vehicle_id={sql_literal(vid)};")
    for image in images:
        statements.append("INSERT INTO vehicle_images (vehicle_id, position, small_key, large_key, width, height, alt) "
                          f"VALUES ({', '.join(map(sql_literal, image))});")
    sql = "\n".join(statements) + "\n"
    with sqlite3.connect(":memory:") as db:
        db.executescript(schema.read_text(encoding="utf-8"))
        db.executescript(sql)
        db.executescript(sql)
        assert db.execute("SELECT COUNT(*) FROM vehicles").fetchone()[0] == EXPECTED_COUNT
        assert db.execute("SELECT COUNT(*) FROM vehicle_images").fetchone()[0] == len(images)
        for row in rows:
            from_sql = db.execute(f"SELECT {columns} FROM vehicles WHERE id=?", (row[0],)).fetchone()
            assert from_sql == tuple(int(value) if isinstance(value, bool) else value for value in row)

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "live-vehicles.sql").write_text(sql, encoding="utf-8")
    (output_dir / "live-photo-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    report = {
        "source": str(source), "sourceSha256": hashlib.sha256(source_bytes).hexdigest(),
        "vehicleCount": len(vehicles), "photoPairCount": len(manifest),
        "soldCount": sum(v["sold"] for v in vehicles),
        "availabilityCounts": {key: sum(v["availability"][key] for v in vehicles)
                               for key in ("hire", "sales", "lease")},
        "listedWithoutDisplayedPrice": [
            {"id": v["id"], "listing": key}
            for v in vehicles for key in ("hire", "sales", "lease")
            if v["availability"][key] and v["pricing"][key] is None
        ],
        "liveImagesNotYetCopiedToR2": True,
        "missingIntrinsicImageDimensions": sum(p[4] is None for p in images),
        "cmsTimestampsUnknown": True,
        "checkedSqlReapply": True,
    }
    (output_dir / "live-seed-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Validated {len(vehicles)} live vehicles, {len(images)} live photo pairs; "
          f"D1 SQL, image manifest and report saved under {output_dir}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("src/content/vehicles.json"))
    parser.add_argument("--schema", type=Path, default=Path("migrations/0001_initial.sql"))
    parser.add_argument("--output-dir", type=Path, default=Path("data"))
    args = parser.parse_args()
    try:
        prepare(args.source, args.schema, args.output_dir)
    except (OSError, ValueError, KeyError, sqlite3.Error, TypeError, AssertionError) as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()

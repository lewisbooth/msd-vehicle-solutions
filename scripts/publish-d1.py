#!/usr/bin/env python3
"""Export a reviewed public D1 snapshot and rebuild static pages after approval.

Usage: export --scope preview|production, inspect data/publish-<scope>*, then
apply --scope ... --approve-sha256 <candidate SHA-256>. No remote writes. Both
steps require authenticated Wrangler access to the explicitly selected D1.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
from urllib.parse import urlsplit
from urllib.request import build_opener, HTTPRedirectHandler, Request
import uuid


ROOT = Path(__file__).resolve().parent.parent
TRACKED = ROOT / "src/content/vehicles.json"
PRODUCTION_CONFIG = ROOT / "wrangler.jsonc"
PREVIEW_CONFIG = ROOT / "wrangler.preview-migrations.jsonc"
OUTPUT_DIR = ROOT / "data"
IDENTIFIER = r"(?:[a-f0-9]{24}|[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})"
ID = re.compile(IDENTIFIER + r"\Z")
LIVE = re.compile(r"https://moorlandselfdrive\.co\.uk/images/vehicles/([a-f0-9]{24})/([a-zA-Z0-9_-]+)-(400|1000)\.jpg\Z")
R2 = re.compile(r"vehicles/(" + IDENTIFIER + r")/([a-zA-Z0-9_-]+)-(400|1000)\.([a-f0-9]{12,16})\.jpg\Z")
PUBLIC_WHERE = "deleted_at IS NULL AND (availability_hire = 1 OR availability_sales = 1 OR availability_lease = 1)"
VEHICLE_SQL = f"SELECT * FROM vehicles WHERE {PUBLIC_WHERE} ORDER BY id"
IMAGE_SQL = ("SELECT vehicle_id, position, small_key, large_key, width, height, alt FROM vehicle_images "
             f"WHERE vehicle_id IN (SELECT id FROM vehicles WHERE {PUBLIC_WHERE}) ORDER BY vehicle_id, position")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        raise ValueError(f"public R2 image redirected: {request.full_url}")


def read_jsonc(path):
    """Strip JSONC comments without damaging '//' inside strings or origins."""
    raw = path.read_text(encoding="utf-8")
    chars = []
    index = 0
    quoted = False
    escaped = False
    while index < len(raw):
        current = raw[index]
        following = raw[index + 1] if index + 1 < len(raw) else ""
        if quoted:
            chars.append(current)
            if escaped:
                escaped = False
            elif current == "\\":
                escaped = True
            elif current == '"':
                quoted = False
            index += 1
            continue
        if current == '"':
            quoted = True
            chars.append(current)
            index += 1
            continue
        if current == "/" and following == "/":
            index += 2
            while index < len(raw) and raw[index] not in "\r\n":
                index += 1
            continue
        if current == "/" and following == "*":
            end = raw.find("*/", index + 2)
            if end == -1:
                raise ValueError(f"unterminated JSONC comment in {path}")
            index = end + 2
            continue
        chars.append(current)
        index += 1
    # JSONC permits trailing commas. Remove them only outside quoted strings.
    clean = []
    quoted = False
    escaped = False
    for index, current in enumerate(chars):
        if quoted:
            clean.append(current)
            if escaped:
                escaped = False
            elif current == "\\":
                escaped = True
            elif current == '"':
                quoted = False
            continue
        if current == '"':
            quoted = True
        if current == "," and next((char for char in chars[index + 1:] if not char.isspace()), "") in ("}", "]"):
            continue
        clean.append(current)
    result = json.loads("".join(clean))
    if not isinstance(result, dict):
        raise ValueError(f"invalid Wrangler JSONC object: {path}")
    return result


def uuid_id(value, label):
    try:
        return str(uuid.UUID(value))
    except (TypeError, ValueError, AttributeError) as exc:
        raise ValueError(f"{label} is not a provisioned D1 database ID") from exc


def binding_id(config, binding):
    found = [item for item in config.get("d1_databases", []) if item.get("binding") == binding]
    if len(found) != 1:
        raise ValueError(f"expected exactly one {binding} D1 binding")
    return uuid_id(found[0].get("database_id"), f"{binding} binding")


def database_scope(scope, preview_config, worker_config):
    worker = read_jsonc(worker_config)
    prod_id = binding_id(worker, "DB")
    if scope == "production":
        return "DB", prod_id, worker_config, worker
    preview = read_jsonc(preview_config)
    preview_id = binding_id(preview, "PREVIEW_DB")
    if preview_id == prod_id:
        raise ValueError("preview D1 ID equals production D1 ID; refusing to query")
    configured_previews = worker.get("previews", {}).get("d1_databases", [])
    worker_preview_ids = [item.get("database_id") or item.get("preview_database_id")
                          for item in configured_previews if item.get("binding") == "DB"]
    if len(worker_preview_ids) != 1 or uuid_id(worker_preview_ids[0], "Worker preview DB") != preview_id:
        raise ValueError("Worker preview D1 binding is absent or differs from isolated export database")
    return "PREVIEW_DB", preview_id, preview_config, worker


def origin(value):
    if not value:
        return ""
    parts = urlsplit(value)
    if (parts.scheme != "https" or not parts.netloc or parts.username or parts.password
        or parts.query or parts.fragment or parts.path not in ("", "/")):
        raise ValueError("media URL must be an HTTPS origin without path/query/fragment")
    return value.rstrip("/")


def wrangler_rows(wrangler, binding, config, sql):
    command = [wrangler, "d1", "execute", binding, "--remote", "--config", str(config),
               "--json", "--command", sql]
    try:
        proc = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False, timeout=60)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ValueError("Wrangler D1 query unavailable; authenticate and verify D1 access") from exc
    if proc.returncode:
        raise ValueError(f"Wrangler remote D1 query failed (exit {proc.returncode}); no snapshot changed")
    try:
        value = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise ValueError("Wrangler did not return JSON D1 results; no snapshot changed") from exc
    if (not isinstance(value, list) or len(value) != 1 or not isinstance(value[0], dict)
        or value[0].get("success") is not True or not isinstance(value[0].get("results"), list)):
        raise ValueError("Wrangler D1 response was incomplete or unsuccessful")
    return value[0]["results"]


def typed_bool(row, key):
    value = row.get(key)
    if type(value) is not int or value not in (0, 1):
        raise ValueError(f"D1 {row.get('id', '')}.{key} is not 0/1")
    return bool(value)


def numeric(value, name, *, integer=False):
    if value is None:
        return None
    if type(value) not in (int, float) or not math.isfinite(value):
        raise ValueError(f"invalid D1 number: {name}")
    if integer and int(value) != value:
        raise ValueError(f"nonintegral D1 field: {name}")
    return int(value) if integer else value


def plain_description(value):
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ValueError("D1 description must be text or null")
    # D1 descriptions are now plain text. React escapes any literal <, >, &.
    return value


def date(value, label):
    if not isinstance(value, str):
        raise ValueError(f"{label} missing timestamp")
    try:
        dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"invalid {label} timestamp") from exc
    return value


def image_url(key, vid, rendition, base, scope):
    if not isinstance(key, str):
        raise ValueError(f"vehicle {vid} image key missing")
    if key.startswith("https://"):
        if scope == "production":
            raise ValueError(f"production vehicle {vid} still uses Lightsail image URL; copy to R2 first")
        parts = urlsplit(key)
        match = LIVE.fullmatch(key)
        if not match or match.group(1) != vid or match.group(3) != rendition or parts.query or parts.fragment:
            raise ValueError(f"vehicle {vid} image URL is not allowlisted live content")
        return key, match.group(2)
    match = R2.fullmatch(key)
    if not match or match.group(1) != vid or match.group(3) != rendition:
        raise ValueError(f"vehicle {vid} image key is not immutable R2 media")
    if not base:
        raise ValueError(f"vehicle {vid} has R2 media but no configured public MEDIA_BASE_URL")
    return f"{base}/{key}", match.group(2)


def to_catalogue(rows, images, media_base, scope="preview"):
    if not rows or len(rows) > 500 or not isinstance(rows, list) or not isinstance(images, list):
        raise ValueError("D1 public catalogue missing or beyond reviewed export size")
    ids = set()
    slugs = set()
    mapped = {}
    for photo in images:
        if not isinstance(photo, dict) or photo.get("vehicle_id") is None:
            raise ValueError("malformed D1 photo row")
        mapped.setdefault(photo["vehicle_id"], []).append(photo)
    if len(images) > 3000:
        raise ValueError("unexpected D1 image count")
    result = []
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("malformed D1 vehicle row")
        vid, slug, name = row.get("id"), row.get("slug"), row.get("name")
        if not isinstance(vid, str) or not ID.fullmatch(vid) or vid in ids:
            raise ValueError(f"malformed/duplicated D1 vehicle ID: {vid}")
        if (not isinstance(slug, str) or not slug or slug in slugs
            or "/" in slug or "?" in slug or "#" in slug or slug in (".", "..")):
            raise ValueError(f"malformed/duplicated D1 slug: {slug}")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"vehicle {vid} has no name")
        ids.add(vid)
        slugs.add(slug)
        if row.get("deleted_at") is not None:
            raise ValueError(f"deleted vehicle {vid} appeared in public query")
        if row.get("condition") not in ("used", "new") or not re.fullmatch(r"(?:car|van)-[a-z]+", row.get("category") or ""):
            raise ValueError(f"invalid condition/category for {vid}")
        availability = {k: typed_bool(row, f"availability_{k}") for k in ("hire", "sales", "lease")}
        if not any(availability.values()):
            raise ValueError(f"unlisted vehicle {vid} appeared in public query")
        photo_rows = mapped.get(vid, [])
        if not photo_rows or sorted(p["position"] for p in photo_rows) != list(range(len(photo_rows))):
            raise ValueError(f"vehicle {vid} missing ordered public photos")
        photos = []
        for pos, p in enumerate(sorted(photo_rows, key=lambda image: image["position"])):
            small, token1 = image_url(p.get("small_key"), vid, "400", media_base, scope)
            large, token2 = image_url(p.get("large_key"), vid, "1000", media_base, scope)
            if token1 != token2:
                raise ValueError(f"vehicle {vid} photo {pos} rendition tokens differ")
            width, height = numeric(p.get("width"), "width", integer=True), numeric(p.get("height"), "height", integer=True)
            if (width is None) != (height is None) or width is not None and (width <= 0 or height <= 0):
                raise ValueError(f"vehicle {vid} has invalid intrinsic image dimensions")
            photos.append({"position": pos, "url": large, "url400": small, "url1000": large,
                           "width": width, "height": height, "alt": p.get("alt") or name})
        price = {k: numeric(row.get(f"pricing_{k}"), f"pricing_{k}", integer=True) for k in ("hire", "sales", "lease")}
        promoted = {k: typed_bool(row, f"promoted_{k}") for k in ("hire", "sales", "lease")}
        result.append({
            "id": vid, "slug": slug, "name": name, "category": row["category"],
            "condition": row["condition"], "sold": typed_bool(row, "sold"),
            "photos": photos, "pricing": price, "availability": availability, "promoted": promoted,
            "details": {"description": plain_description(row.get("description")),
                        "storage": {key: numeric(row.get(f"storage_{key}"), f"storage_{key}")
                                    for key in ("width", "height", "length")},
                        "cargo": numeric(row.get("cargo"), "cargo"),
                        "seats": numeric(row.get("seats"), "seats", integer=True),
                        "doors": numeric(row.get("doors"), "doors", integer=True),
                        "engineSize": numeric(row.get("engine_size"), "engine_size"),
                        "fuelType": row.get("fuel_type"), "fuelEconomy": numeric(row.get("fuel_economy"), "fuel_economy"),
                        "transmission": row.get("transmission"), "height": numeric(row.get("height"), "height"),
                        "mileage": numeric(row.get("mileage"), "mileage", integer=True),
                        "year": numeric(row.get("year"), "year", integer=True)},
            "createdAt": date(row.get("created_at"), f"{vid}.created_at"),
            "updatedAt": date(row.get("updated_at"), f"{vid}.updated_at"),
        })
    if set(mapped) != ids:
        raise ValueError("D1 returned orphan or missing photo rows")
    return result


def candidate_bytes(catalogue):
    return (json.dumps(catalogue, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def verify_public_media(catalogue):
    """Production build must never publish media that the public cannot read."""
    opener = build_opener(NoRedirect)
    urls = {photo[key] for vehicle in catalogue for photo in vehicle["photos"]
            for key in ("url400", "url1000")}
    for url in sorted(urls):
        try:
            with opener.open(Request(url, method="HEAD"), timeout=10) as response:
                if response.status != 200 or response.headers.get_content_type() != "image/jpeg":
                    raise ValueError(f"public R2 JPEG is not served correctly: {url}")
                length = response.headers.get("Content-Length")
                if length is not None and (not length.isdigit() or int(length) < 128):
                    raise ValueError(f"public R2 JPEG has empty/invalid length: {url}")
        except OSError as exc:
            raise ValueError(f"public R2 JPEG cannot be reached: {url}") from exc


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_remote(args):
    binding, db_id, config, worker = database_scope(args.scope, args.preview_config, args.worker_config)
    base = origin(args.media_base_url)
    if args.scope == "production" and not base:
        raise ValueError("production publication requires a public R2 --media-base-url")
    runtime_vars = worker.get("previews", {}).get("vars", {}) if args.scope == "preview" else worker.get("vars", {})
    runtime_base = origin(runtime_vars.get("MEDIA_BASE_URL", ""))
    if base and runtime_base != base:
        raise ValueError(f"{args.scope} Worker MEDIA_BASE_URL differs from selected publication host")
    first = wrangler_rows(args.wrangler, binding, config, VEHICLE_SQL)
    media = wrangler_rows(args.wrangler, binding, config, IMAGE_SQL)
    again = wrangler_rows(args.wrangler, binding, config, VEHICLE_SQL)
    media_again = wrangler_rows(args.wrangler, binding, config, IMAGE_SQL)
    if first != again or media != media_again:
        raise ValueError("D1 vehicle or photo rows changed while exporting; retry with stable data")
    catalogue = to_catalogue(first, media, base, args.scope)
    if args.scope == "production":
        verify_public_media(catalogue)
    return catalogue, db_id


def paths(scope):
    return OUTPUT_DIR / f"publish-{scope}.json", OUTPUT_DIR / f"publish-{scope}-report.json"


def differences(previous, current):
    old = {v["slug"]: v for v in previous}
    new = {v["slug"]: v for v in current}
    return {"addedSlugs": sorted(set(new) - set(old)),
            "removedSlugs": sorted(set(old) - set(new)),
            "changedSlugs": sorted(slug for slug in old.keys() & new.keys() if old[slug] != new[slug])}


def export(args):
    catalogue, db_id = read_remote(args)
    previous_raw = TRACKED.read_bytes()
    previous = json.loads(previous_raw)
    if not isinstance(previous, list):
        raise ValueError("tracked public snapshot is invalid")
    candidate = candidate_bytes(catalogue)
    candidate_path, report_path = paths(args.scope)
    diff = differences(previous, catalogue)
    report = {"scope": args.scope, "databaseId": db_id,
              "mediaBaseUrl": origin(args.media_base_url),
              "sourceSnapshotSha256": sha(previous_raw), "candidateSha256": sha(candidate),
              "exportedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
              "previousCount": len(previous), "candidateCount": len(catalogue), **diff}
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    candidate_path.write_bytes(candidate)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Review {candidate_path} and {report_path}\nCandidate SHA-256: {report['candidateSha256']}")
    print(f"Added: {diff['addedSlugs']}\nRemoved: {diff['removedSlugs']}\nChanged: {diff['changedSlugs']}")


def apply(args):
    candidate_path, report_path = paths(args.scope)
    report = json.loads(report_path.read_text(encoding="utf-8"))
    candidate = candidate_path.read_bytes()
    if report.get("scope") != args.scope or sha(candidate) != report.get("candidateSha256"):
        raise ValueError("candidate report and reviewed snapshot mismatch")
    if not re.fullmatch(r"[a-f0-9]{64}", args.approve_sha256 or "") or args.approve_sha256 != sha(candidate):
        raise ValueError("--approve-sha256 must equal the reviewed candidate digest")
    previous_raw = TRACKED.read_bytes()
    if sha(previous_raw) != report.get("sourceSnapshotSha256"):
        raise ValueError("tracked snapshot changed after export; repeat review")
    current, db_id = read_remote(args)
    if db_id != report.get("databaseId") or origin(args.media_base_url) != report.get("mediaBaseUrl"):
        raise ValueError("database ID or media origin differs from reviewed export")
    if candidate != candidate_bytes(current):
        raise ValueError("D1 public data changed since review; export again")
    diff = differences(json.loads(previous_raw), current)
    for key in ("addedSlugs", "removedSlugs", "changedSlugs"):
        if diff[key] != report.get(key):
            raise ValueError("candidate diff changed since review")
    print(f"Approved {args.scope} catalogue: +{len(diff['addedSlugs'])}, -{len(diff['removedSlugs'])}, "
          f"~{len(diff['changedSlugs'])}; building static HTML", flush=True)
    # Replace the tracked snapshot only after the explicit hash approval and a
    # fresh authenticated read of exactly the same D1 database.
    temporary = TRACKED.with_suffix(".json.tmp")
    temporary.write_bytes(candidate)
    temporary.replace(TRACKED)
    try:
        subprocess.run([args.npm, "run", "build"], cwd=ROOT, check=True, timeout=300)
    except (OSError, subprocess.TimeoutExpired, subprocess.CalledProcessError):
        TRACKED.write_bytes(previous_raw)
        raise ValueError("static build failed; restored previous tracked catalogue")
    print("Static build complete. Review the Git diff and generated routes before committing.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("export", "apply"))
    parser.add_argument("--scope", choices=("preview", "production"), required=True)
    parser.add_argument("--media-base-url", default="", help="Must match selected Worker runtime MEDIA_BASE_URL for R2 keys")
    parser.add_argument("--approve-sha256", help="Required to apply reviewed candidate")
    parser.add_argument("--preview-config", type=Path, default=PREVIEW_CONFIG)
    parser.add_argument("--worker-config", type=Path, default=PRODUCTION_CONFIG)
    parser.add_argument("--wrangler", default=str(ROOT / "node_modules/.bin/wrangler"))
    parser.add_argument("--npm", default="npm")
    args = parser.parse_args()
    try:
        if args.action == "export":
            export(args)
        else:
            apply(args)
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()

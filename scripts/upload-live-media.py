#!/usr/bin/env python3
"""Prepare and optionally upload only the 30 current public vehicle JPEGs to R2.

Reads the reviewed live-photo manifest. --cache-dir supplies locally downloaded
live-site bytes; otherwise files are fetched from the single allowlisted host.
Never reads historic media. Dry run is the default; --execute writes to R2.
"""

from __future__ import annotations

import argparse
from io import BytesIO
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import subprocess
from urllib.parse import urlsplit
from urllib.request import build_opener, HTTPRedirectHandler, Request

try:
    from PIL import Image, UnidentifiedImageError
except ImportError:
    raise SystemExit("Pillow is required to fully decode and verify live JPEGs (python3 -m pip install Pillow)")


PATTERN = re.compile(r"/images/vehicles/([0-9a-f]{24})/([A-Za-z0-9_-]+)-(400|1000)\.jpg\Z")
MAX_BYTES = 12 * 1024 * 1024
CACHE_CONTROL = "public, max-age=31536000, immutable"
Image.MAX_IMAGE_PIXELS = 40_000_000


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        raise ValueError(f"refusing redirected live image URL: {request.full_url}")


def checked_url(url, vehicle_id, token, rendition):
    if not isinstance(url, str):
        raise ValueError("manifest URL must be a string")
    parts = urlsplit(url)
    match = PATTERN.fullmatch(parts.path)
    if (parts.scheme != "https" or parts.netloc != "moorlandselfdrive.co.uk"
        or parts.query or parts.fragment or not match
        or match.groups() != (vehicle_id, token, rendition)):
        raise ValueError(f"unrecognized current-site image URL: {url}")
    return parts.path


def live_bytes(url, cache_dir, path, offline):
    # The cache mirrors the *live URL* path after /images, e.g.
    # <cache>/vehicles/<id>/<token>-400.jpg. Never read arbitrary manifest paths.
    local = cache_dir / path.removeprefix("/images/") if cache_dir else None
    if local and local.is_file():
        data = local.read_bytes()
    else:
        if offline:
            raise ValueError(f"live image absent from offline cache: {url}")
        opener = build_opener(NoRedirect)
        request = Request(url, headers={"User-Agent": "MSD-live-image-migration/1.0", "Accept": "image/jpeg"})
        with opener.open(request, timeout=20) as response:
            content_type = response.headers.get_content_type()
            if content_type != "image/jpeg":
                raise ValueError(f"unexpected Content-Type {content_type} for {url}")
            data = response.read(MAX_BYTES + 1)
        if local:
            local.parent.mkdir(parents=True, exist_ok=True)
            local.write_bytes(data)
    if not data or len(data) > MAX_BYTES:
        raise ValueError(f"empty/oversize live image: {url}")
    return data


def verify_jpeg(data, url):
    if len(data) < 32 or data[:2] != b"\xff\xd8" or data[-2:] != b"\xff\xd9":
        raise ValueError(f"missing JPEG markers/EOI: {url}")
    try:
        with Image.open(BytesIO(data)) as image:
            if image.format != "JPEG":
                raise ValueError(f"non-JPEG image: {url}")
            image.verify()
        with Image.open(BytesIO(data)) as image:
            image.load()  # decode the full entropy stream, not merely the header
            width, height = image.size
    except (OSError, UnidentifiedImageError) as exc:
        raise ValueError(f"invalid/corrupt JPEG: {url}: {exc}") from exc
    if not width or not height:
        raise ValueError(f"zero-dimension JPEG: {url}")
    return width, height


def sql_string(value):
    return "'" + value.replace("'", "''") + "'"


def media_base_url(value):
    if not value:
        return "/api/media"
    parts = urlsplit(value)
    if (parts.scheme != "https" or not parts.netloc or parts.username or parts.password
        or parts.query or parts.fragment or parts.path not in ("", "/")):
        raise ValueError("--media-base-url must be an HTTPS origin, without path/query/fragment")
    return value.rstrip("/")


def source_pairs(catalogue, manifest):
    if not isinstance(catalogue, list) or len(catalogue) != 15 or not isinstance(manifest, list) or len(manifest) != 15:
        raise ValueError("expected reviewed catalogue and manifest to contain 15 live vehicles")
    by_id = {v["id"]: v for v in catalogue}
    if len(by_id) != 15:
        raise ValueError("duplicate catalogue IDs")
    checked = []
    visited = set()
    for item in manifest:
        vid, token, position = item["vehicleId"], item["token"], item["position"]
        if vid not in by_id or (vid, position) in visited:
            raise ValueError(f"duplicate/unexpected live photo: {vid}/{position}")
        visited.add((vid, position))
        vehicle = by_id[vid]
        if item["slug"] != vehicle["slug"] or position >= len(vehicle["photos"]):
            raise ValueError(f"manifest/catalogue identity differs for {vid}")
        photo = vehicle["photos"][position]
        if photo["url400"] != item["source400"] or photo["url1000"] != item["source1000"]:
            raise ValueError(f"manifest/catalogue photo URLs differ for {vid}")
        for rendition in ("400", "1000"):
            url = item[f"source{rendition}"]
            checked.append((vid, position, rendition, url, checked_url(url, vid, token, rendition)))
    if len(checked) != 30:
        raise ValueError("expected exactly 30 reviewed live URLs")
    return checked


def prepare(args):
    catalogue = json.loads(args.catalogue.read_text(encoding="utf-8"))
    sources = json.loads(args.manifest.read_text(encoding="utf-8"))
    photos = source_pairs(catalogue, sources)
    base = media_base_url(args.media_base_url)
    audit_path = args.cache_manifest or (args.cache_dir / "manifest.json" if args.cache_dir else None)
    audited = None
    if audit_path and audit_path.exists():
        audit = json.loads(audit_path.read_text(encoding="utf-8"))
        if not isinstance(audit, dict) or audit.get("count") != 30 or not isinstance(audit.get("media"), list):
            raise ValueError(f"invalid live media audit: {audit_path}")
        audited = {entry["source_url"]: entry for entry in audit["media"]}
        if len(audited) != 30 or set(audited) != {p[3] for p in photos}:
            raise ValueError("live media audit URLs do not match curated catalogue")
    elif args.cache_manifest:
        raise ValueError(f"live media audit not found: {args.cache_manifest}")
    media_root = args.output_dir / "live-r2"
    result = {}
    upload_manifest = []
    for vid, position, rendition, url, path in photos:
        original = live_bytes(url, args.cache_dir, path, args.offline)
        width, height = verify_jpeg(original, url)
        digest = hashlib.sha256(original).hexdigest()
        if audited:
            entry = audited[url]
            if (entry["sha256"] != digest or entry["bytes"] != len(original)
                or entry["width"] != width or entry["height"] != height):
                raise ValueError(f"live media changed since independent image audit: {url}")
        token = sources[next(i for i, pair in enumerate(sources) if pair["vehicleId"] == vid and pair["position"] == position)]["token"]
        key = f"vehicles/{vid}/{token}-{rendition}.{digest[:12]}.jpg"
        target = media_root / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(original)
        result.setdefault((vid, position), {})[rendition] = {"key": key, "url": f"{base}/{key}", "width": width, "height": height}
        upload_manifest.append({"key": key, "file": str(target.relative_to(args.output_dir)),
                                "sourceUrl": url, "sha256": digest, "bytes": len(original),
                                "width": width, "height": height,
                                "contentType": "image/jpeg", "cacheControl": CACHE_CONTROL})

    statements = ["-- Updates only the 15 photographed vehicles in the reviewed live-site snapshot.",
                  "-- Idempotent for these same source URLs and content-hashed keys; verify remote changes before publishing."]
    updated = json.loads(json.dumps(catalogue))
    for vehicle in updated:
        vid = vehicle["id"]
        for photo in vehicle["photos"]:
            position = photo["position"]
            pair = result[vid, position]
            small, large = pair["400"], pair["1000"]
            old_small, old_large = photo["url400"], photo["url1000"]
            assignments = f"small_key={sql_string(small['key'])}, large_key={sql_string(large['key'])}, width={large['width']}, height={large['height']}"
            statements.append(
                f"UPDATE vehicle_images SET {assignments} WHERE vehicle_id={sql_string(vid)} "
                f"AND position={position} AND ((small_key={sql_string(old_small)} AND large_key={sql_string(old_large)}) "
                f"OR (small_key={sql_string(small['key'])} AND large_key={sql_string(large['key'])}));")
            photo.update({"url": large["url"], "url400": small["url"], "url1000": large["url"],
                          "width": large["width"], "height": large["height"]})
    sql = "\n".join(statements) + "\n"
    # Rehearse the reviewed live seed and media replacement twice in SQLite.
    with sqlite3.connect(":memory:") as db:
        db.executescript(args.schema.read_text(encoding="utf-8"))
        db.executescript(args.seed_sql.read_text(encoding="utf-8"))
        db.executescript(sql)
        db.executescript(sql)
        rows = db.execute("SELECT vehicle_id, position, small_key, large_key, width, height FROM vehicle_images").fetchall()
        expected = {(vid, pos): (pair["400"]["key"], pair["1000"]["key"],
                                 pair["1000"]["width"], pair["1000"]["height"])
                    for (vid, pos), pair in result.items()}
        if len(rows) != 15 or any((small, large, width, height) != expected.get((vid, pos))
                                  for vid, pos, small, large, width, height in rows):
            raise ValueError("D1 media SQL failed local idempotent replay/row reconciliation")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "live-r2-update.sql").write_text(sql, encoding="utf-8")
    (args.output_dir / "live-r2-manifest.json").write_text(json.dumps(upload_manifest, indent=2) + "\n", encoding="utf-8")
    (args.output_dir / "live-vehicles-r2.json").write_text(json.dumps(updated, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    report = {"vehicleCount": len(catalogue), "imageCount": len(upload_manifest),
              "sourceOrigins": ["https://moorlandselfdrive.co.uk"],
              "mediaBaseUrl": base, "totalBytes": sum(item["bytes"] for item in upload_manifest),
              "keyCount": len({item["key"] for item in upload_manifest}),
              "independentLiveAuditMatched": audited is not None,
              "checkedSqlReapply": True,
              "noRemoteWritesUnlessExecute": True}
    (args.output_dir / "live-r2-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if report["keyCount"] != 30:
        raise ValueError("unexpected duplicate content-hashed key")
    print(f"Verified {report['imageCount']} fully decoded live JPEGs ({report['totalBytes']} bytes); "
          f"wrote SQL, R2 manifest, and public snapshot to {args.output_dir}", flush=True)
    return upload_manifest


def upload(args, manifest):
    if not args.bucket or not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,61}[a-z0-9]", args.bucket):
        raise ValueError("--execute requires a valid isolated preview R2 bucket name")
    checkpoint = args.output_dir / f"live-r2-uploaded-{args.bucket}.json"
    done = json.loads(checkpoint.read_text(encoding="utf-8")) if checkpoint.exists() else {}
    if not isinstance(done, dict):
        raise ValueError("invalid local upload checkpoint")
    todo = [m for m in manifest if done.get(m["key"]) != m["sha256"]]
    print(f"Uploading {len(todo)} of {len(manifest)} content-hashed objects to {args.bucket}", flush=True)
    for index, item in enumerate(todo, 1):
        local = args.output_dir / item["file"]
        if hashlib.sha256(local.read_bytes()).hexdigest() != item["sha256"]:
            raise ValueError(f"file changed after verification: {local}")
        command = [args.wrangler, "r2", "object", "put", f"{args.bucket}/{item['key']}",
                   "--file", str(local), "--content-type", "image/jpeg",
                   "--cache-control", CACHE_CONTROL, "--remote"]
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL)
        done[item["key"]] = item["sha256"]
        temporary = checkpoint.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(done, indent=2) + "\n", encoding="utf-8")
        temporary.replace(checkpoint)
        if index % 5 == 0 or index == len(todo):
            print(f"Uploaded {index}/{len(todo)}", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalogue", type=Path, default=Path("src/content/vehicles.json"))
    parser.add_argument("--manifest", type=Path, default=Path("data/live-photo-manifest.json"))
    parser.add_argument("--output-dir", type=Path, default=Path("data"))
    parser.add_argument("--cache-dir", type=Path, help="Live URL mirror under <cache>/vehicles/<id>/<token>-400.jpg")
    parser.add_argument("--cache-manifest", type=Path, help="Independent live-image SHA/dimension audit; auto-detected at <cache>/manifest.json")
    parser.add_argument("--offline", action="store_true", help="Require every live image in --cache-dir; never fetch")
    parser.add_argument("--schema", type=Path, default=Path("migrations/0001_initial.sql"))
    parser.add_argument("--seed-sql", type=Path, default=Path("data/live-vehicles.sql"))
    parser.add_argument("--media-base-url", default="", help="Public R2 HTTPS origin; omitted uses /api/media fallback")
    parser.add_argument("--bucket", help="Dedicated preview R2 bucket, required with --execute")
    parser.add_argument("--wrangler", default="./node_modules/.bin/wrangler")
    parser.add_argument("--execute", action="store_true", help="Write remote R2; default only validates/prepares")
    args = parser.parse_args()
    try:
        if args.offline and args.cache_dir is None:
            raise ValueError("--offline requires --cache-dir")
        manifest = prepare(args)
        if args.execute:
            upload(args, manifest)
        else:
            print("Dry run only; no Cloudflare writes. Add --execute and --bucket after preview access is provisioned.")
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()

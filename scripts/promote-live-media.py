#!/usr/bin/env python3
"""Copy the reviewed, live-only vehicle JPEGs into the production R2 bucket.

Run from the repository root:

    python3 scripts/promote-live-media.py
    python3 scripts/promote-live-media.py --execute

The first command verifies all 30 staged files without touching Cloudflare.
The second uses authenticated Wrangler to write the same, content-addressed
objects to the production bucket defined in wrangler.jsonc. It never reads the
archived backup or the preview R2 bucket. Verify remote objects independently
before deleting the preview bucket.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MANIFEST = DATA / "live-r2-manifest.json"
SNAPSHOT = ROOT / "src/content/vehicles.json"
CONFIG = ROOT / "wrangler.jsonc"
WRANGLER = ROOT / "node_modules/.bin/wrangler"
BUCKET = "msd-vehicle-solutions"
CACHE_CONTROL = "public, max-age=31536000, immutable"
KEY = re.compile(r"vehicles/([a-f0-9]{24})/([A-Za-z0-9_-]+)-(400|1000)\.([a-f0-9]{12})\.jpg\Z")
MAX_IMAGE_BYTES = 12 * 1024 * 1024


def production_bucket() -> str:
    # The checked-in config currently uses plain JSON, which is valid JSONC.
    # Fail closed if a future JSONC edit cannot be parsed unambiguously.
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    if config.get("name") != BUCKET:
        raise ValueError("Worker name does not match the intended production project")
    bindings = [b for b in config.get("r2_buckets", []) if b.get("binding") == "MEDIA"]
    preview = [b for b in config.get("previews", {}).get("r2_buckets", []) if b.get("binding") == "MEDIA"]
    if (len(bindings) != 1 or bindings[0].get("bucket_name") != BUCKET
            or any(b.get("bucket_name") == BUCKET for b in preview)):
        raise ValueError("production MEDIA bucket binding is missing or shared with preview")
    databases = [b for b in config.get("d1_databases", []) if b.get("binding") == "DB"]
    preview_db = [b for b in config.get("previews", {}).get("d1_databases", []) if b.get("binding") == "DB"]
    if (len(databases) != 1 or not databases[0].get("database_id")
            or any(databases[0]["database_id"] == b.get("database_id") for b in preview_db)):
        raise ValueError("production D1 binding is missing or shared with preview")
    return BUCKET


def verified_manifest() -> list[tuple[str, Path, int, str]]:
    records = json.loads(MANIFEST.read_text(encoding="utf-8"))
    snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    if not isinstance(records, list) or len(records) != 30:
        raise ValueError("expected exactly 30 reviewed live JPEGs")
    if not isinstance(snapshot, list) or len(snapshot) != 15:
        raise ValueError("tracked public snapshot must contain exactly 15 live vehicles")

    expected = {}
    for vehicle in snapshot:
        vid, photos = vehicle["id"], vehicle["photos"]
        if vid in expected or not re.fullmatch(r"[a-f0-9]{24}", vid) or len(photos) != 1:
            raise ValueError("snapshot IDs or current vehicle photos are invalid")
        pair = {}
        for rendition in ("400", "1000"):
            url = photos[0][f"url{rendition}"]
            parts = urlsplit(url)
            if parts.scheme != "https" or not parts.netloc or parts.query or parts.fragment:
                raise ValueError("snapshot JPEG must have a public HTTPS URL")
            key = parts.path.removeprefix("/")
            match = KEY.fullmatch(key)
            if not match or match.group(1) != vid or match.group(3) != rendition:
                raise ValueError("snapshot does not use the reviewed immutable media keys")
            pair[rendition] = key
        expected[vid] = pair

    seen: set[str] = set()
    verified = []
    total = 0
    for item in records:
        key = item["key"]
        match = KEY.fullmatch(key)
        if not match or key in seen:
            raise ValueError(f"unrecognized or repeated immutable media key: {key}")
        seen.add(key)
        vid, token, rendition, short_hash = match.groups()
        if expected.get(vid, {}).get(rendition) != key:
            raise ValueError(f"media key not referenced by the current public snapshot: {key}")
        source = urlsplit(item["sourceUrl"])
        if (source.scheme != "https" or source.netloc != "moorlandselfdrive.co.uk"
                or source.path != f"/images/vehicles/{vid}/{token}-{rendition}.jpg"
                or source.query or source.fragment):
            raise ValueError(f"unexpected source for live JPEG: {key}")
        if (item["file"] != f"live-r2/{key}" or item.get("contentType") != "image/jpeg"
                or item.get("cacheControl") != CACHE_CONTROL):
            raise ValueError(f"media path/type/cache metadata differs: {key}")
        path = DATA / item["file"]
        if not path.resolve().is_relative_to((DATA / "live-r2").resolve()) or not path.is_file():
            raise ValueError(f"staged current JPEG missing: {key}")
        digest = item["sha256"]
        size = item["bytes"]
        if (not isinstance(digest, str) or not re.fullmatch(r"[a-f0-9]{64}", digest)
                or not isinstance(size, int) or not 32 <= size <= MAX_IMAGE_BYTES
                or digest[:12] != short_hash):
            raise ValueError(f"invalid expected size or digest: {key}")
        data = path.read_bytes()
        if (len(data) != size or hashlib.sha256(data).hexdigest() != digest
                or data[:2] != b"\xff\xd8" or data[-2:] != b"\xff\xd9"):
            raise ValueError(f"staged JPEG differs from audited live photo: {key}")
        total += size
        verified.append((key, path, size, digest))

    if len(seen) != 30 or total != 2_309_370:
        raise ValueError("live image count or audited byte total differs")
    return verified


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="upload verified files into production R2")
    args = parser.parse_args()
    try:
        bucket = production_bucket()
        media = verified_manifest()
        print(f"Verified {len(media)} current JPEGs ({sum(size for _, _, size, _ in media)} bytes) for {bucket}", flush=True)
        if not args.execute:
            print("Dry run complete. Add --execute to upload to the configured production bucket.")
            return
        if not WRANGLER.is_file():
            raise ValueError("Wrangler is not installed; run npm ci")
        for index, (key, path, size, digest) in enumerate(media, start=1):
            current = path.read_bytes()
            if len(current) != size or hashlib.sha256(current).hexdigest() != digest:
                raise ValueError(f"staged JPEG changed before upload: {key}")
            command = [str(WRANGLER), "r2", "object", "put", f"{bucket}/{key}",
                       "--config", str(CONFIG), "--file", str(path),
                       "--content-type", "image/jpeg", "--cache-control", CACHE_CONTROL, "--remote"]
            result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=90, check=False)
            if result.returncode:
                # Wrangler output can contain account information; don't echo it here.
                raise ValueError(f"remote R2 upload failed at {index}/{len(media)} ({key}); exit {result.returncode}")
            if index % 5 == 0 or index == len(media):
                print(f"Uploaded {index}/{len(media)} verified JPEGs", flush=True)
    except (KeyError, TypeError, OSError, ValueError, subprocess.TimeoutExpired) as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()

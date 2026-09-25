// Verify the production binding before applying remote D1 migrations from CI.
// --check validates the checked-in target without making a Cloudflare request.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const filename = 'wrangler.jsonc';
const expectedDbId = 'b96f63ee-7a31-45e8-8a7e-bdd4ee9372e0';
const expectedBucket = 'msd-vehicle-solutions';
const temporaryR2Host = 'pub-f23343a6d1d74aca9ae43823407d11da.r2.dev';

function binding(value, name, label) {
  if (!Array.isArray(value)) throw new Error(`${label}: binding list is missing`);
  const matches = value.filter((item) => item?.binding === name);
  if (matches.length !== 1) throw new Error(`${label}: expected exactly one ${name} binding`);
  return matches[0];
}

function validate() {
  const file = fileURLToPath(new URL(`../${filename}`, import.meta.url));
  const parsed = ts.parseConfigFileTextToJson(file, readFileSync(file, 'utf8'));
  if (parsed.error || !parsed.config || Array.isArray(parsed.config)) {
    throw new Error(`${filename}: invalid Wrangler configuration`);
  }
  const worker = parsed.config;
  if (worker.name !== 'msd-vehicle-solutions') {
    throw new Error('production Worker name does not match the expected project');
  }
  const db = binding(worker.d1_databases, 'DB', 'production D1');
  if (db.database_id !== expectedDbId || db.database_name !== expectedBucket ||
      db.migrations_dir !== './migrations') {
    throw new Error('production D1 binding differs from the expected Western Europe database');
  }
  const media = binding(worker.r2_buckets, 'MEDIA', 'production R2');
  if (media.bucket_name !== expectedBucket) {
    throw new Error('production R2 binding does not identify the Western Europe bucket');
  }
  const preview = worker.previews?.d1_databases ?? [];
  if (preview.some((item) => item.database_id === expectedDbId)) {
    throw new Error('Worker Preview D1 must not point at production D1');
  }
  const previewMedia = worker.previews?.r2_buckets ?? [];
  if (previewMedia.some((item) => item.bucket_name === expectedBucket)) {
    throw new Error('Worker Preview R2 must not point at production R2');
  }
  const base = worker.vars?.MEDIA_BASE_URL;
  let origin;
  try {
    origin = new URL(base);
  } catch {
    throw new Error('production MEDIA_BASE_URL is missing or invalid');
  }
  if (origin.protocol !== 'https:' || origin.origin !== base ||
      origin.username || origin.password ||
      origin.origin === worker.previews?.vars?.MEDIA_BASE_URL ||
      (origin.hostname.endsWith('.r2.dev') && origin.hostname !== temporaryR2Host)) {
    throw new Error('production MEDIA_BASE_URL must use its own public HTTPS media origin');
  }
}

try {
  if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--check')) {
    throw new Error('usage: node scripts/migrate-production.mjs [--check]');
  }
  validate();
  if (process.argv[2] === '--check') {
    console.log('Production migration configuration matches the Western Europe D1/R2 bindings.');
  } else {
    const result = spawnSync('wrangler', [
      'd1', 'migrations', 'apply', 'DB', '--remote', '--config', filename,
    ], { cwd: root, stdio: 'inherit' });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
} catch (error) {
  console.error(`Production migration blocked: ${error.message}`);
  process.exitCode = 1;
}

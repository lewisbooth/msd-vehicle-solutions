// Check the remote migration target before Wrangler is allowed to write to D1.
// --check validates configuration without contacting Cloudflare.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationFile = 'wrangler.preview-migrations.jsonc';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function config(filename) {
  const path = fileURLToPath(new URL(`../${filename}`, import.meta.url));
  const parsed = ts.parseConfigFileTextToJson(path, readFileSync(path, 'utf8'));
  if (parsed.error || !parsed.config || Array.isArray(parsed.config)) {
    throw new Error(`${filename}: invalid Wrangler configuration`);
  }
  return parsed.config;
}

function binding(value, name, label) {
  if (!Array.isArray(value)) throw new Error(`${label}: binding list is missing`);
  const matches = value.filter((item) => item?.binding === name);
  if (matches.length !== 1) throw new Error(`${label}: expected exactly one ${name} binding`);
  return matches[0];
}

function validate() {
  const worker = config('wrangler.jsonc');
  const migrations = config(migrationFile);
  const productionDb = binding(worker.d1_databases, 'DB', 'production D1');
  const previewDb = binding(worker.previews?.d1_databases, 'DB', 'Worker Preview D1');
  const migrationDb = binding(migrations.d1_databases, 'PREVIEW_DB', 'migration D1');
  if (!uuid.test(productionDb.database_id) || !uuid.test(previewDb.database_id) ||
      !uuid.test(migrationDb.database_id)) {
    throw new Error('production, Preview and migration D1 bindings need actual database UUIDs');
  }
  if (previewDb.database_id.toLowerCase() === productionDb.database_id.toLowerCase()) {
    throw new Error('Preview D1 equals production D1; refusing migration');
  }
  if (migrationDb.database_id.toLowerCase() !== previewDb.database_id.toLowerCase() ||
      migrationDb.database_name !== previewDb.database_name ||
      migrationDb.migrations_dir !== previewDb.migrations_dir) {
    throw new Error('migration target must match the Worker Preview D1 binding and migration directory');
  }
  const productionBucket = binding(worker.r2_buckets, 'MEDIA', 'production R2');
  const previewBucket = binding(worker.previews?.r2_buckets, 'MEDIA', 'Worker Preview R2');
  if (!previewBucket.bucket_name || previewBucket.bucket_name === productionBucket.bucket_name) {
    throw new Error('Preview R2 must be a named bucket separate from production R2');
  }
  const mediaBase = worker.previews?.vars?.MEDIA_BASE_URL;
  const origin = typeof mediaBase === 'string' ? new URL(mediaBase) : null;
  if (!origin || origin.protocol !== 'https:' || origin.origin !== mediaBase ||
      origin.username || origin.password) {
    throw new Error('Preview MEDIA_BASE_URL must be a public HTTPS origin');
  }
}

try {
  if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--check')) {
    throw new Error('usage: node scripts/migrate-preview.mjs [--check]');
  }
  validate();
  if (process.argv[2] === '--check') {
    console.log('Preview migration configuration is isolated and consistent.');
  } else {
    const result = spawnSync('wrangler', [
      'd1', 'migrations', 'apply', 'PREVIEW_DB', '--remote', '--config', migrationFile,
    ], { cwd: root, stdio: 'inherit' });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
} catch (error) {
  console.error(`Preview migration blocked: ${error.message}`);
  process.exitCode = 1;
}

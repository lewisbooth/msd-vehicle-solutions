import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, join, posix, resolve } from 'node:path';

const source = resolve('public');
const dest = resolve('dist');
const prepared = resolve('.generated/static');
const manifest = JSON.parse(await readFile(resolve('.generated/static-manifest.json'), 'utf8'));

async function collect(relative, assets) {
  for (const entry of await readdir(join(source, relative), { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = posix.join(relative, entry.name);
    if (path === 'images/vehicles') {
      assets.push('images/vehicles/vehicle-photo-default.png');
      continue;
    }
    if (entry.isDirectory()) await collect(path, assets);
    else if (entry.isFile()) assets.push(path);
    else throw new Error(`Unsupported static asset entry: ${path}`);
  }
}

const assets = [];
await collect('images', assets);
assets.push('favicon.ico');
if (Object.keys(manifest).length !== assets.length) {
  throw new Error('Static manifest is stale: asset count changed since prepare-static.');
}

const targets = new Set();
for (const relative of assets.sort()) {
  const original = `/${relative}`;
  const bytes = await readFile(join(source, relative));
  const ext = extname(relative);
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const target = `/${relative.slice(0, -ext.length)}.${digest}${ext}`;
  if (manifest[original] !== target || targets.has(target)) {
    throw new Error(`Static manifest is stale or contains a duplicate target: ${relative}`);
  }
  const preparedBytes = await readFile(join(prepared, target.slice(1)));
  if (!bytes.equals(preparedBytes)) throw new Error(`Prepared static asset has changed: ${relative}`);
  targets.add(target);
  const path = join(dest, target.slice(1));
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, bytes, { flag: 'wx' });
}

for (const relative of ['robots.txt', '_headers']) await cp(join(source, relative), join(dest, relative));
for (const entry of await readdir(source)) {
  if (/^google[a-z0-9]+\.html$/.test(entry)) await cp(join(source, entry), join(dest, entry));
}
console.log(`Copied ${assets.length} content-addressed static assets.`);

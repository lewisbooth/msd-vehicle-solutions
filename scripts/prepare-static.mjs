// Prepare a deterministic URL map before Vite builds the browser bundle and
// before the public HTML is rendered. Both use the same content-addressed URLs.
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, posix, resolve } from 'node:path';

const root = resolve('public');
const output = resolve('.generated/static-manifest.json');
const staticDir = resolve('.generated/static');
const assets = [];

// Vite's CSS-only build does not remove HTML files from an older public build.
// Clear generated output explicitly so stale prerendered vehicle pages cannot
// win Static Assets routing ahead of D1 rendering.
await rm(resolve('dist'), { recursive: true, force: true });

async function collect(relative) {
  for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = posix.join(relative, entry.name);
    if (path === 'images/vehicles') {
      assets.push('images/vehicles/vehicle-photo-default.png');
      continue;
    }
    if (entry.isDirectory()) await collect(path);
    else if (entry.isFile()) assets.push(path);
    else throw new Error(`Unsupported static asset entry: ${path}`);
  }
}

await collect('images');
assets.push('favicon.ico');

const manifest = {};
const targets = new Set();
await rm(staticDir, { recursive: true, force: true });
for (const relative of assets.sort()) {
  const bytes = await readFile(join(root, relative));
  const ext = extname(relative);
  if (!ext) throw new Error(`Static asset has no extension: ${relative}`);
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const target = `/${relative.slice(0, -ext.length)}.${digest}${ext}`;
  if (targets.has(target)) throw new Error(`Static asset target collision: ${target}`);
  targets.add(target);
  manifest[`/${relative}`] = target;
  const path = join(staticDir, target.slice(1));
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes, { flag: 'wx' });
}

await mkdir(resolve('.generated'), { recursive: true });
await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Fingerprinted ${assets.length} bundled static assets.`);

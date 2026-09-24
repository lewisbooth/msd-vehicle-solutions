import { cp, mkdir, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const source = resolve('public');
const dest = resolve('dist');
const copy = async (relative) => {
  await mkdir(join(dest, relative, '..'), { recursive: true });
  await cp(join(source, relative), join(dest, relative), { recursive: true });
};

for (const entry of await readdir(join(source, 'images'), { withFileTypes: true })) {
  if (entry.name === 'vehicles' || entry.name.startsWith('.')) continue;
  await copy(join('images', entry.name));
}
await copy(join('images', 'vehicles', 'vehicle-photo-default.png'));
for (const relative of ['fonts', 'favicon.ico', 'robots.txt', '_headers']) await copy(relative);
for (const entry of await readdir(source)) {
  if (/^google[a-z0-9]+\.html$/.test(entry)) await copy(entry);
}

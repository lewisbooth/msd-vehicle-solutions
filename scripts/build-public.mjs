// Package only build metadata for the Worker; public HTML is rendered from D1.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifest = JSON.parse(await readFile(resolve('dist/.vite/manifest.json'), 'utf8'));
const staticAssets = JSON.parse(await readFile(resolve('.generated/static-manifest.json'), 'utf8'));
const css = manifest['styles.css']?.file;
const script = manifest['interactions.js']?.file;
const favicon = staticAssets['/favicon.ico'];
if (!css?.endsWith('.css') || !script?.endsWith('.js') || !favicon) {
  throw new Error('Missing fingerprinted public CSS, interactions script or favicon.');
}
const legal = {};
for (const page of ['privacy', 'terms-and-conditions']) {
  const html = await readFile(resolve(`src/content/${page}.html`), 'utf8');
  if (/<script\b/i.test(html)) throw new Error(`Unexpected script in ${page}.html`);
  legal[page] = html;
}
await writeFile(resolve('.generated/public-build.json'), `${JSON.stringify({ css: `/${css}`, script: `/${script}`, favicon, legal })}\n`);
console.log('Prepared Worker-rendered public pages with fingerprinted CSS and interactions.');

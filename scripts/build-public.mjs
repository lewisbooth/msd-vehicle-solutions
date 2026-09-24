// Generate real, crawlable HTML for each route. The React bundle hydrates the
// markup and refreshes live stock from /api, but the initial page is complete.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const root = resolve('.');
const outDir = join(root, 'dist');
const origin = 'https://moorlandselfdrive.co.uk';
const featuredOrder = JSON.parse(readFileSync(join(root, 'src/content/featured.json'), 'utf8'));
const pages = {
  '/': ['Car & Van Hire in Stoke-on-Trent', 'Flexible car and van hire, sales and leasing for personal and business use across Staffordshire since 1986. Open 7 days a week.'],
  '/sales': ['New & Used Vehicles for Sale in Stoke-on-Trent', 'Discover new and used cars and vans for sale at Moorland Self Drive. Local service and competitive finance options.'],
  '/leasing': ['Car & Van Leasing Deals in Stoke-on-Trent', 'Personal and business car and van leasing in Stoke-on-Trent, with flexible finance options and friendly local advice.'],
  '/van-sizes': ['Which Van Size Should You Choose?', 'A guide to small, medium, large and Luton vans for moving, delivery and everyday jobs.'],
  '/customs': ['Van Conversions & Custom Vehicles in Stoke-on-Trent', 'Bespoke van conversions, ply-lining, joinery and vehicle modifications by MSD Custom Commercials.'],
  '/servicing': ['Vehicle Servicing, Repairs & Tyres in Stoke-on-Trent', 'Car and van servicing, tyre changes, wheel alignment, maintenance and repairs in Knypersley.'],
  '/contact': ['Contact Moorland Self Drive', 'Contact Moorland Self Drive about car and van hire, sales, leasing, conversions, servicing and repairs in Stoke-on-Trent.'],
  '/privacy': ['Privacy Policy', 'Read the Moorland Self Drive privacy policy.'],
  '/terms-and-conditions': ['Terms and Conditions', 'Read the Moorland Self Drive terms and conditions.'],
  '/vehicles/listing/hire': ['Vehicles for Hire in Stoke-on-Trent', 'Browse available cars and vans for hire with flexible daily and weekly options in Stoke-on-Trent.'],
  '/vehicles/listing/sales': ['Vehicles for Sale in Stoke-on-Trent', 'Find new and used cars and vans for sale at Moorland Self Drive in Stoke-on-Trent.'],
  '/vehicles/listing/lease': ['Vehicles for Lease in Stoke-on-Trent', 'Explore cars and vans for personal and business leasing at Moorland Self Drive.'],
};

function encodeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function xmlEscape(value) { return encodeHtml(value); }
function scriptJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
function normaliseSnapshot(json) {
  const vehicles = Array.isArray(json) ? json : json?.vehicles;
  if (!Array.isArray(vehicles)) throw new Error('data/vehicles.json must be an array or { vehicles: [] }.');
  for (const vehicle of vehicles) {
    if (!vehicle.slug || !vehicle.name) throw new Error('Snapshot vehicle has no slug or name.');
    if (vehicle.slug.includes('/') || vehicle.slug === '.' || vehicle.slug === '..') throw new Error(`Unsafe vehicle slug: ${vehicle.slug}`);
  }
  const slugs = vehicles.map(vehicle => vehicle.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error('Vehicle slugs must be unique.');
  return vehicles;
}
async function snapshot() {
  const file = process.env.MSD_LOCAL_SNAPSHOT === '1' ? 'data/vehicles.json' : 'src/content/vehicles.json';
  try { return normaliseSnapshot(JSON.parse(await readFile(join(root, file), 'utf8'))); }
  catch (error) {
    if (error.code === 'ENOENT' && process.env.MSD_ALLOW_EMPTY_SNAPSHOT === '1') return [];
    throw new Error(`Public build needs a valid ${file} snapshot: ${error.message}`);
  }
}
function legalContent(which) {
  // Tracked HTML was captured from the current public legal pages. It is not
  // user-submitted text and is never modified through the new admin.
  const html = readFileSync(join(root, `src/content/${which}.html`), 'utf8');
  if (/<script\b/i.test(html)) throw new Error(`Unexpected script in ${which}.html`);
  return html;
}
function typeOf(path) { return path.split('/')[3]; }
function price(vehicle, type) { return Number(vehicle?.pricing?.[type]) > 0 ? Number(vehicle.pricing[type]) : Number.MAX_SAFE_INTEGER; }
function available(vehicles, type) { return vehicles.filter(vehicle => vehicle.availability?.[type] && (type === 'sales' || !vehicle.sold)).sort((a,b) => price(a,type) - price(b,type)); }
function featured(vehicles, type) {
  const current = vehicles.filter(vehicle => vehicle.availability?.[type] && !vehicle.sold);
  // Historical landing-page order is a preference, not a publishing constraint:
  // an admin can sell, unlist or remove any of these vehicles at any time.
  const pinned = [...new Set(featuredOrder[type] || [])]
    .map(slug => current.find(vehicle => vehicle.slug === slug))
    .filter(Boolean);
  const pinnedSlugs = new Set(pinned.map(vehicle => vehicle.slug));
  const rest = current.filter(vehicle => !pinnedSlugs.has(vehicle.slug))
    .sort((a,b) => Number(Boolean(b.promoted?.[type])) - Number(Boolean(a.promoted?.[type])) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  return [...pinned, ...rest].slice(0,3);
}
function stripDescription(value) {
  return String(value || '').replace(/<\s*br\s*\/?\s*>|<\s*\/p\s*>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
}
const contentFor = (path, vehicles) => {
  if (path.startsWith('/vehicles/listing/')) return { path, vehicles: available(vehicles, typeOf(path)) };
  if (path === '/privacy') return { path, legalHtml: legalContent('privacy') };
  if (path === '/terms-and-conditions') return { path, legalHtml: legalContent('terms-and-conditions') };
  if (['/', '/sales', '/leasing', '/van-sizes'].includes(path)) return { path, featured: {
    hire: featured(vehicles, 'hire'), sales: featured(vehicles, 'sales'), lease: featured(vehicles, 'lease')
  } };
  if (path.startsWith('/vehicles/')) {
    const slug = path.slice('/vehicles/'.length);
    const vehicle = vehicles.find(entry => entry.slug === slug);
    if (!vehicle) throw new Error(`No vehicle found for ${path}`);
    const ref = ['hire', 'sales', 'lease'].find(type => vehicle.availability?.[type]) || 'hire';
    return { path, vehicle, relatedVehicles: vehicles.filter(entry => entry.id !== vehicle.id && entry.category === vehicle.category && !entry.sold && entry.availability?.[ref]).slice(0,3), ref };
  }
  return { path };
};
function metadata(path, initial) {
  const vehicle = initial.vehicle;
  if (!vehicle) return pages[path] || ['Page not found', 'The page you requested was not found.'];
  const details = vehicle.details || {};
  const suffix = vehicle.sold ? ' — Sold' : '';
  const title = `${details.year ? `${details.year} ` : ''}${vehicle.name}${suffix} in Stoke-on-Trent`;
  const description = stripDescription(details.description) || `${vehicle.name}: view details, photos and availability for hire, sale or lease. Call ${phone} for more information.`;
  return [title, `${description.slice(0, 215)} | Call 01782 517782`];
}
const phone = '01782 517782';
function pathnameFile(path) { return path === '/' ? join(outDir,'index.html') : join(outDir,`${path.slice(1)}.html`); }

const vehicles = await snapshot();
const manifest = JSON.parse(await readFile(join(outDir, '.vite/manifest.json'), 'utf8'));
const entry = Object.values(manifest).find(item => item.isEntry && item.file?.endsWith('.js'));
if (!entry) throw new Error('No public JS entry in Vite manifest.');
const cssLinks = (entry.css || []).map(file => `<link rel="stylesheet" href="/${encodeHtml(file)}">`).join('');
const vite = await createServer({ configFile: join(root, 'vite.public.config.mjs'), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
let App;
try { ({ App } = await vite.ssrLoadModule('/App.jsx')); }
catch (error) { await vite.close(); throw error; }

const routes = [...Object.keys(pages), ...vehicles.map(vehicle => `/vehicles/${vehicle.slug}`), '/404'];
const canonicalPath = path => path === '/404' ? '' : path;
for (const path of routes) {
  const initial = path === '/404' ? { path } : contentFor(path, vehicles);
  const [title, description] = metadata(path, initial);
  const titleWithBrand = `${title} | ${path === '/customs' ? 'MSD Custom Commercials' : 'Moorland Self Drive'}`;
  const canonical = `${origin}${canonicalPath(path)}`;
  const photo = initial.vehicle?.photos?.[0];
  const image = photo && typeof photo !== 'string' ? photo.url1000 || photo.url : undefined;
  const schema = path === '/' ? {
    '@context':'https://schema.org', '@type':'AutoRental', name:'Moorland Self Drive',
    url: origin, telephone: '+441782517782', address: { '@type':'PostalAddress', streetAddress:'Childerplay Road, Knypersley', addressLocality:'Stoke-on-Trent', postalCode:'ST8 7PZ', addressCountry:'GB' }
  } : null;
  const markup = renderToString(React.createElement(App, {initial}));
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#16467b"><meta name="description" content="${encodeHtml(description)}"><meta property="og:type" content="website"><meta property="og:title" content="${encodeHtml(titleWithBrand)}"><meta property="og:description" content="${encodeHtml(description)}"><meta property="og:url" content="${encodeHtml(canonical)}">${image ? `<meta property="og:image" content="${encodeHtml(new URL(image, origin).href)}">` : ''}<meta name="twitter:card" content="summary_large_image">${path !== '/404' ? `<link rel="canonical" href="${encodeHtml(canonical)}">` : '<meta name="robots" content="noindex">'}<link rel="icon" href="/favicon.ico">${cssLinks}<title>${encodeHtml(titleWithBrand)}</title>${schema ? `<script type="application/ld+json">${scriptJson(schema)}</script>` : ''}</head><body><div id="root">${markup}</div><script id="msd-page-data" type="application/json">${scriptJson(initial)}</script><script type="module" src="/${encodeHtml(entry.file)}"></script></body></html>`;
  const filename = pathnameFile(path);
  await mkdir(dirname(filename), { recursive:true });
  await writeFile(filename, html);
}

// The old /vehicles route is a real redirect in Express; a static landing page
// keeps this legacy bookmark useful without involving the API Worker.
await writeFile(join(outDir,'vehicles.html'), '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/vehicles/listing/hire?size=all"><link rel="canonical" href="https://moorlandselfdrive.co.uk/vehicles/listing/hire"></head><body><a href="/vehicles/listing/hire?size=all">See vehicles for hire</a></body></html>');
const locs = routes.filter(path => path !== '/404').map(path => {
  // The current public site does not expose actual CMS modification times.
  // The observation date in the snapshot must not become a sitemap lastmod.
  return `<url><loc>${xmlEscape(`${origin}${path === '/' ? '/' : path.split('/').map(encodeURIComponent).join('/')}`)}</loc></url>`;
});
await writeFile(join(outDir,'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locs.join('')}</urlset>`);
await vite.close();
console.log(`Rendered ${routes.length} public HTML pages (${vehicles.length} vehicle pages), plus sitemap and legacy /vehicles landing.`);

import React from "react";
import { renderToStaticMarkup } from "react-dom/server.browser";
import { App } from "../src/public/App.jsx";
import build from "../.generated/public-build.json";
import { HttpError } from "./model";
import { loadPageData, type PageData } from "./page-data";
import type { RuntimeEnv } from "./env";

const origin = "https://moorlandselfdrive.co.uk";
const pages: Record<string, [string, string]> = {
  "/": ["Car & Van Hire in Stoke-on-Trent", "Flexible car and van hire, sales and leasing for personal and business use across Staffordshire since 1986. Open 7 days a week."],
  "/sales": ["New & Used Vehicles for Sale in Stoke-on-Trent", "Discover new and used cars and vans for sale at Moorland Self Drive. Local service and competitive finance options."],
  "/leasing": ["Car & Van Leasing Deals in Stoke-on-Trent", "Personal and business car and van leasing in Stoke-on-Trent, with flexible finance options and friendly local advice."],
  "/van-sizes": ["Which Van Size Should You Choose?", "A guide to small, medium, large and Luton vans for moving, delivery and everyday jobs."],
  "/customs": ["Van Conversions & Custom Vehicles in Stoke-on-Trent", "Bespoke van conversions, ply-lining, joinery and vehicle modifications by MSD Custom Commercials."],
  "/servicing": ["Vehicle Servicing, Repairs & Tyres in Stoke-on-Trent", "Car and van servicing, tyre changes, wheel alignment, maintenance and repairs in Knypersley."],
  "/contact": ["Contact Moorland Self Drive", "Contact Moorland Self Drive about car and van hire, sales, leasing, conversions, servicing and repairs in Stoke-on-Trent."],
  "/privacy": ["Privacy Policy", "Read the Moorland Self Drive privacy policy."],
  "/terms-and-conditions": ["Terms and Conditions", "Read the Moorland Self Drive terms and conditions."],
  "/vehicles/listing/hire": ["Vehicles for Hire in Stoke-on-Trent", "Browse available cars and vans for hire with flexible daily and weekly options in Stoke-on-Trent."],
  "/vehicles/listing/sales": ["Vehicles for Sale in Stoke-on-Trent", "Find new and used cars and vans for sale at Moorland Self Drive in Stoke-on-Trent."],
  "/vehicles/listing/lease": ["Vehicles for Lease in Stoke-on-Trent", "Explore cars and vans for personal and business leasing at Moorland Self Drive."],
};
const esc = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const scriptJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e")
  .replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
const cleanDescription = (value: unknown) => String(value || "").replace(/<\s*br\s*\/?\s*>|<\s*\/p\s*>/gi, " ")
  .replace(/<[^>]*>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();

function metadata(path: string, initial: PageData): [string, string] {
  const vehicle = initial.vehicle;
  if (!vehicle) return pages[path] || ["Page not found", "The page you requested was not found."];
  const suffix = vehicle.sold ? " — Sold" : "";
  const title = `${vehicle.details.year ? `${vehicle.details.year} ` : ""}${vehicle.name}${suffix} in Stoke-on-Trent`;
  const description = cleanDescription(vehicle.details.description) ||
    `${vehicle.name}: view details, photos and availability for hire, sale or lease. Call 01782 517782 for more information.`;
  return [title, `${description.slice(0, 215)} | Call 01782 517782`];
}

function document(path: string, initial: PageData, status = 200): Response {
  const [title, description] = metadata(path, initial);
  const titleWithBrand = `${title} | ${path === "/customs" ? "MSD Custom Commercials" : "Moorland Self Drive"}`;
  const canonical = `${origin}${path}`;
  const image = initial.vehicle?.photos?.[0]?.url1000;
  const schema = path === "/" ? {
    "@context": "https://schema.org", "@type": "AutoRental", name: "Moorland Self Drive",
    url: origin, telephone: "+441782517782", address: { "@type": "PostalAddress", streetAddress: "Childerplay Road, Knypersley", addressLocality: "Stoke-on-Trent", postalCode: "ST8 7PZ", addressCountry: "GB" }
  } : null;
  const markup = renderToStaticMarkup(React.createElement(App, { initial }));
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#16467b"><meta name="description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(titleWithBrand)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">${image ? `<meta property="og:image" content="${esc(new URL(image, origin).href)}">` : ""}<meta name="twitter:card" content="summary_large_image">${status === 200 ? `<link rel="canonical" href="${esc(canonical)}">` : '<meta name="robots" content="noindex">'}<link rel="icon" href="${esc(build.favicon)}"><link rel="stylesheet" href="${esc(build.css)}"><noscript><style>@media(max-width:850px){.header-inner{flex-wrap:wrap}.primary-nav{display:grid;position:static;order:3;width:100%;box-shadow:none}.menu-toggle{display:none}}.contact-form button[type=submit]{display:none}</style></noscript><title>${esc(titleWithBrand)}</title>${schema ? `<script type="application/ld+json">${scriptJson(schema)}</script>` : ""}</head><body>${markup}<script type="module" src="${esc(build.script)}"></script></body></html>`;
  return new Response(html, { status, headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}

export function pageError(status: number): Response {
  if (status === 404) return document("/404", { path: "/404" }, status);
  const unavailable = status >= 500;
  const heading = unavailable ? "This page is temporarily unavailable." :
    status === 405 ? "This request method is not supported." : "Check the page address or filters.";
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${status} | Moorland Self Drive</title><link rel="icon" href="${esc(build.favicon)}"><link rel="stylesheet" href="${esc(build.css)}"></head><body><main class="shell error-page"><span class="eyebrow">${status}</span><h1>${esc(heading)}</h1><p>Please try again or call 01782 517782 for help.</p><a class="btn btn-blue" href="/">Go to home</a></main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

async function sitemap(env: RuntimeEnv): Promise<Response> {
  const results = await env.DB.prepare(
    "SELECT slug FROM vehicles WHERE deleted_at IS NULL AND (availability_sales = 1 OR (sold = 0 AND (availability_hire = 1 OR availability_lease = 1))) ORDER BY slug"
  ).all<{ slug: string }>();
  const paths = [...Object.keys(pages), ...results.results.map(({slug}) => `/vehicles/${encodeURIComponent(slug)}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${esc(origin + path)}</loc></url>`).join("")}</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function publicPage(request: Request, env: RuntimeEnv, url: URL): Promise<Response> {
  const path = url.pathname;
  if (request.method !== "GET" && request.method !== "HEAD") return pageError(405);
  if (path !== "/" && path.endsWith("/")) {
    const canonical = path.replace(/\/+$/, "");
    if (pages[canonical] || canonical === "/vehicles" || /^\/vehicles\/[^/]+$/.test(canonical) ||
      /^\/vehicles\/listing\/(hire|sales|lease)$/.test(canonical)) {
      url.pathname = canonical;
      return Response.redirect(url, 308);
    }
  }
  if (path === "/vehicles") {
    return Response.redirect(new URL("/vehicles/listing/hire?size=all", url), 302);
  }
  if (path === "/sitemap.xml") return sitemap(env);
  const initial = await loadPageData(env, path, url);
  if (initial) return document(path, initial);
  if (path === "/privacy" || path === "/terms-and-conditions") {
    return document(path, { path, legalHtml: build.legal[path.slice(1) as keyof typeof build.legal] } as PageData);
  }
  if (path === "/contact") return document(path, { path, vehicleName: (url.searchParams.get("vehicle") || "").slice(0, 160) } as PageData);
  if (pages[path]) return document(path, { path });
  throw new HttpError(404, "Page not found");
}

import featuredOrder from "../src/content/featured.json";
import { HttpError, vehicleDto, type ImageRow, type Vehicle, type VehicleRow } from "./model";
import type { RuntimeEnv } from "./env";

export type ListingType = "hire" | "sales" | "lease";

export type ListingFilters = {
  sort: "price-low" | "price-high" | "newest";
  size: string;
  seats: string;
  fuel: string;
};

export type PageData = {
  path: string;
  featured?: Partial<Record<ListingType, Vehicle[]>>;
  vehicles?: Vehicle[];
  filters?: ListingFilters;
  vehicle?: Vehicle;
  relatedVehicles?: Vehicle[];
  ref?: ListingType;
};

const listingTypes: ListingType[] = ["hire", "sales", "lease"];
const categories = new Set([
  "car-economy", "car-hatchback", "car-saloon", "car-performance", "car-suv", "car-truck",
  "car-minibus", "van-small", "van-medium", "van-large", "van-luton",
]);

// A sold vehicle remains public only while explicitly listed for sale. Records
// removed from every listing must not remain accessible at a guessed detail URL.
const publicVehicle = "deleted_at IS NULL AND (availability_sales = 1 OR (sold = 0 AND (availability_hire = 1 OR availability_lease = 1)))";

async function photosFor(env: RuntimeEnv, rows: VehicleRow[]): Promise<ImageRow[]> {
  if (!rows.length) return [];
  const photos: ImageRow[] = [];
  // Bound parameter counts if the catalogue grows beyond the original import.
  for (let index = 0; index < rows.length; index += 100) {
    const ids = rows.slice(index, index + 100).map((row) => row.id);
    const batch = await env.DB.prepare(
      `SELECT * FROM vehicle_images WHERE vehicle_id IN (${ids.map(() => "?").join(",")}) ORDER BY vehicle_id, position`
    ).bind(...ids).all<ImageRow>();
    photos.push(...batch.results);
  }
  return photos;
}

async function toVehicles(env: RuntimeEnv, rows: VehicleRow[]): Promise<Vehicle[]> {
  const photos = await photosFor(env, rows);
  return rows.map((row) => vehicleDto(row, photos, env.MEDIA_BASE_URL));
}

function readFilters(url: URL): ListingFilters {
  const sort = url.searchParams.get("sort") || "price-low";
  const size = url.searchParams.get("size") || "all";
  const seats = url.searchParams.get("seats") || "all";
  const fuel = url.searchParams.get("fuel") || "all";
  if (!["price-low", "price-high", "newest"].includes(sort)) throw new HttpError(400, "Invalid sort");
  if (!["all", "all-cars", "all-vans"].includes(size) && !categories.has(size)) {
    throw new HttpError(400, "Invalid size");
  }
  if (seats !== "all" && seats !== "4+" && !/^\d{1,2}$/.test(seats)) {
    throw new HttpError(400, "Invalid seats");
  }
  if (fuel !== "all" && !/^[a-z-]{2,24}$/.test(fuel)) throw new HttpError(400, "Invalid fuel");
  return { sort: sort as ListingFilters["sort"], size, seats, fuel };
}

async function listing(env: RuntimeEnv, path: string, type: ListingType, url: URL): Promise<PageData> {
  const filters = readFilters(url);
  // Column names are selected from the fixed listing type union, never from a
  // request string. Filter values are always bound parameters.
  const where = [`${publicVehicle}`, `availability_${type} = 1`];
  const values: Array<string | number> = [];
  if (type !== "sales") where.push("sold = 0");
  if (filters.size === "all-cars" || filters.size === "all-vans") {
    where.push("category LIKE ?");
    values.push(filters.size === "all-cars" ? "car-%" : "van-%");
  } else if (filters.size !== "all") {
    where.push("category = ?");
    values.push(filters.size);
  }
  if (filters.seats === "4+") where.push("seats > 3");
  else if (filters.seats !== "all") {
    where.push("seats = ?");
    values.push(Number(filters.seats));
  }
  if (filters.fuel !== "all") {
    where.push("LOWER(fuel_type) = ?");
    values.push(filters.fuel);
  }
  const price = `pricing_${type}`;
  const order = filters.sort === "newest"
    ? "updated_at DESC, id"
    : `CASE WHEN ${price} IS NULL OR ${price} <= 0 THEN 1 ELSE 0 END, ` +
      `CASE WHEN ${price} > 0 THEN ${price} END ${filters.sort === "price-high" ? "DESC" : "ASC"}, name COLLATE NOCASE, id`;
  const result = await env.DB.prepare(`SELECT * FROM vehicles WHERE ${where.join(" AND ")} ORDER BY ${order}`)
    .bind(...values).all<VehicleRow>();
  return { path, filters, vehicles: await toVehicles(env, result.results) };
}

async function featured(env: RuntimeEnv, path: string, type: ListingType): Promise<PageData> {
  const result = await env.DB.prepare(
    `SELECT * FROM vehicles WHERE ${publicVehicle} AND sold = 0 AND availability_${type} = 1 ` +
    `ORDER BY promoted_${type} DESC, updated_at DESC, id`
  ).all<VehicleRow>();
  // Admin promotion has priority; the original published card order breaks
  // ties among equally promoted records and remains stable for the initial D1.
  const originalOrder = new Map([...new Set(featuredOrder[type])].map((slug, index) => [slug, index]));
  const selected = result.results.sort((a, b) =>
    Number(b[`promoted_${type}`]) - Number(a[`promoted_${type}`]) ||
    (originalOrder.get(a.slug) ?? Infinity) - (originalOrder.get(b.slug) ?? Infinity) ||
    b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id)
  ).slice(0, 3);
  return { path, featured: { [type]: await toVehicles(env, selected) } };
}

async function detail(env: RuntimeEnv, path: string, encodedSlug: string, url: URL): Promise<PageData> {
  let slug: string;
  try { slug = decodeURIComponent(encodedSlug); }
  catch { throw new HttpError(400, "Invalid vehicle slug"); }
  // Existing live slugs include punctuation such as "(72)" and "3.0".
  // Permit that established segment spelling, but not separators, escapes,
  // whitespace or dot-only relative segments.
  if (slug.length > 180 || !/^[a-z0-9](?:[a-z0-9.()-]*[a-z0-9])?$/.test(slug)) {
    throw new HttpError(400, "Invalid vehicle slug");
  }
  const row = await env.DB.prepare(`SELECT * FROM vehicles WHERE slug = ? AND ${publicVehicle}`)
    .bind(slug).first<VehicleRow>();
  if (!row) throw new HttpError(404, "Vehicle not found");
  const fallback = listingTypes.find((type) => row[`availability_${type}`] && (type === "sales" || !row.sold)) || "hire";
  const requested = url.searchParams.get("ref");
  const ref = requested && listingTypes.includes(requested as ListingType) &&
    row[`availability_${requested}`] && (requested === "sales" || !row.sold)
    ? requested as ListingType : fallback;
  const related = await env.DB.prepare(
    `SELECT * FROM vehicles WHERE ${publicVehicle} AND id <> ? AND category = ? ` +
    `AND sold = 0 AND availability_${ref} = 1 ORDER BY updated_at DESC, id LIMIT 3`
  ).bind(row.id, row.category).all<VehicleRow>();
  const vehicles = await toVehicles(env, [row, ...related.results]);
  return { path, vehicle: vehicles[0], relatedVehicles: vehicles.slice(1), ref };
}

/** Return the D1 content for routes that need it; null means another route owns the request. */
export async function loadPageData(env: RuntimeEnv, path: string, url: URL): Promise<PageData | null> {
  const homepageType: Partial<Record<string, ListingType>> = {
    "/": "hire", "/sales": "sales", "/leasing": "lease",
  };
  const homepage = homepageType[path];
  if (homepage) return featured(env, path, homepage);
  if (path === "/van-sizes") return { path };
  const listingMatch = /^\/vehicles\/listing\/(hire|sales|lease)$/.exec(path);
  if (listingMatch) return listing(env, path, listingMatch[1] as ListingType, url);
  const detailMatch = /^\/vehicles\/([^/]+)$/.exec(path);
  if (detailMatch) return detail(env, path, detailMatch[1], url);
  return null;
}

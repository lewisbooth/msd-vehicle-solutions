import { HttpError, json, vehicleDto, type ImageRow, type Vehicle, type VehicleRow } from "./model";
import type { RuntimeEnv } from "./env";

type ListingType = "hire" | "sales" | "lease";
const types: ListingType[] = ["hire", "sales", "lease"];
const categories = new Set([
  "car-economy", "car-hatchback", "car-saloon", "car-performance", "car-suv", "car-truck",
  "car-minibus", "van-small", "van-medium", "van-large", "van-luton",
]);

async function rowsAndImages(env: RuntimeEnv): Promise<{ rows: VehicleRow[]; images: ImageRow[] }> {
  const [vehicles, photos] = await Promise.all([
    env.DB.prepare("SELECT * FROM vehicles WHERE deleted_at IS NULL ORDER BY updated_at DESC").all<VehicleRow>(),
    env.DB.prepare("SELECT * FROM vehicle_images ORDER BY vehicle_id, position").all<ImageRow>(),
  ]);
  return { rows: vehicles.results, images: photos.results };
}

function currentVehicles(rows: VehicleRow[], images: ImageRow[], mediaBase?: string): Vehicle[] {
  return rows.map((row) => vehicleDto(row, images, mediaBase));
}

function listFilter(vehicles: Vehicle[], url: URL): Vehicle[] {
  const typeParam = url.searchParams.get("type");
  if (typeParam && !types.includes(typeParam as ListingType)) throw new HttpError(400, "Invalid listing type");
  const type = typeParam as ListingType | null;
  // Sales intentionally retains sold stock cards; hire and lease list available unsold stock.
  let result = type ? vehicles.filter((v) => v.availability[type] && (type === "sales" || !v.sold)) : vehicles;
  const size = url.searchParams.get("size");
  if (size && size !== "all") {
    if (size === "all-cars") result = result.filter((v) => v.category.startsWith("car-"));
    else if (size === "all-vans") result = result.filter((v) => v.category.startsWith("van-"));
    else if (categories.has(size)) result = result.filter((v) => v.category === size);
    else throw new HttpError(400, "Invalid size");
  }
  const seats = url.searchParams.get("seats");
  if (seats && seats !== "all") {
    if (seats === "4+") result = result.filter((v) => (v.details.seats ?? 0) > 3);
    else if (/^\d{1,2}$/.test(seats)) result = result.filter((v) => v.details.seats === Number(seats));
    else throw new HttpError(400, "Invalid seats");
  }
  const fuel = url.searchParams.get("fuel");
  if (fuel && fuel !== "all") {
    if (!/^[a-z-]{2,24}$/.test(fuel)) throw new HttpError(400, "Invalid fuel");
    result = result.filter((v) => v.details.fuelType?.toLowerCase() === fuel);
  }
  const sort = url.searchParams.get("sort") || "price-low";
  if (!new Set(["price-low", "price-high", "newest"]).has(sort)) throw new HttpError(400, "Invalid sort");
  if (type && sort !== "newest") {
    result.sort((a, b) => {
      const left = a.pricing[type];
      const right = b.pricing[type];
      // Historical -1 means price on application, not a negative advertised price.
      const leftUnknown = left == null || left < 0;
      const rightUnknown = right == null || right < 0;
      if (leftUnknown !== rightUnknown) return leftUnknown ? 1 : -1;
      if (leftUnknown || rightUnknown) return a.name.localeCompare(b.name);
      return (sort === "price-high" ? right - left : left - right) || a.name.localeCompare(b.name);
    });
  } else {
    result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return result;
}

export async function publicApi(request: Request, env: RuntimeEnv, url: URL): Promise<Response> {
  const path = url.pathname;
  if (path === "/api/health" && request.method === "GET") {
    await env.DB.prepare("SELECT 1 FROM vehicles LIMIT 1").first();
    return json({ ok: true });
  }
  if (path.startsWith("/api/media/") && request.method === "GET") {
    const key = decodeURIComponent(path.slice("/api/media/".length));
    if (!/^vehicles\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\.(?:jpe?g|webp)$/.test(key)) {
      throw new HttpError(404, "Image not found");
    }
    const object = await env.MEDIA.get(key);
    if (!object) throw new HttpError(404, "Image not found");
    if (request.headers.get("If-None-Match") === object.httpEtag) {
      return new Response(null, { status: 304, headers: { ETag: object.httpEtag, "Cache-Control": "public, max-age=31536000, immutable" } });
    }
    const headers = new Headers({
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      ETag: object.httpEtag,
    });
    object.writeHttpMetadata(headers);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "image/jpeg");
    return new Response(object.body, { headers });
  }
  const detail = path.match(/^\/api\/vehicles\/([^/]+)$/);
  if (detail && request.method === "GET") {
    let slug: string;
    try {
      slug = decodeURIComponent(detail[1]);
    } catch {
      throw new HttpError(400, "Invalid vehicle slug");
    }
    if (slug.length > 180 || slug.includes("/")) throw new HttpError(400, "Invalid vehicle slug");
    const { rows, images } = await rowsAndImages(env);
    const current = currentVehicles(rows, images, env.MEDIA_BASE_URL);
    const vehicle = current.find((v) => v.slug === slug);
    if (!vehicle) throw new HttpError(404, "Vehicle not found");
    const ref = url.searchParams.get("ref");
    const type = ref && types.includes(ref as ListingType) ? ref as ListingType : null;
    const relatedVehicles = current
      .filter((v) => v.id !== vehicle.id && v.category === vehicle.category && !v.sold && (!type || v.availability[type]))
      .slice(0, 3);
    return json({ vehicle, relatedVehicles }, 200, "public, max-age=30, stale-while-revalidate=60");
  }
  if (path === "/api/vehicles" && request.method === "GET") {
    const { rows, images } = await rowsAndImages(env);
    const vehicles = listFilter(currentVehicles(rows, images, env.MEDIA_BASE_URL), url);
    return json({ vehicles }, 200, "public, max-age=30, stale-while-revalidate=60");
  }
  if (path === "/api/home" && request.method === "GET") {
    const { rows, images } = await rowsAndImages(env);
    const current = currentVehicles(rows, images, env.MEDIA_BASE_URL);
    const pick = (type: ListingType) => current
      .filter((v) => !v.sold && v.availability[type])
      .sort((a, b) => Number(b.promoted[type]) - Number(a.promoted[type]) || b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 4);
    return json({ featured: { hire: pick("hire"), sales: pick("sales"), lease: pick("lease") } }, 200,
      "public, max-age=30, stale-while-revalidate=60");
  }
  throw new HttpError(404, "Endpoint not found");
}

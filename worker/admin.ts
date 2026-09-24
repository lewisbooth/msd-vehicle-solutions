import { createRemoteJWKSet, jwtVerify } from "jose";
import { HttpError, json, readJsonObject, vehicleDto, type ImageRow, type VehicleRow } from "./model";
import type { RuntimeEnv } from "./env";

const categories = new Set([
  "car-economy", "car-hatchback", "car-saloon", "car-performance", "car-suv", "car-truck",
  "car-minibus", "van-small", "van-medium", "van-large", "van-luton",
]);

function string(value: unknown, field: string, max: number, optional = false): string {
  if (optional && (value === undefined || value === null)) return "";
  if (typeof value !== "string" || (!optional && !value.trim()) || value.length > max) {
    throw new HttpError(400, `Invalid ${field}`);
  }
  return value.trim();
}

function number(value: unknown, field: string, min: number, max: number): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new HttpError(400, `Invalid ${field}`);
  }
  return value;
}

function flag(value: unknown): number {
  return value === true ? 1 : 0;
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, `Invalid ${field}`);
  }
  return value as Record<string, unknown>;
}

function vehicleFields(payload: Record<string, unknown>): Record<string, string | number | null> {
  const pricing = record(payload.pricing, "pricing");
  const availability = record(payload.availability, "availability");
  const promoted = record(payload.promoted, "promoted");
  const details = record(payload.details, "details");
  const storage = record(details.storage, "storage");
  const name = string(payload.name, "name", 150);
  const category = string(payload.category, "category", 40);
  if (!categories.has(category)) throw new HttpError(400, "Invalid category");
  const condition = string(payload.condition, "condition", 10);
  if (condition !== "new" && condition !== "used") throw new HttpError(400, "Invalid condition");
  const price = (type: string) => number(pricing[type], `pricing.${type}`, -1, 1_000_000);
  return {
    name, category, condition,
    sold: flag(payload.sold),
    pricing_hire: price("hire"), pricing_sales: price("sales"), pricing_lease: price("lease"),
    availability_hire: flag(availability.hire), availability_sales: flag(availability.sales),
    availability_lease: flag(availability.lease),
    promoted_hire: flag(promoted.hire), promoted_sales: flag(promoted.sales),
    promoted_lease: flag(promoted.lease),
    description: string(details.description, "description", 12000, true),
    storage_width: number(storage.width, "storage.width", 0, 100000),
    storage_height: number(storage.height, "storage.height", 0, 100000),
    storage_length: number(storage.length, "storage.length", 0, 100000),
    cargo: number(details.cargo, "cargo", 0, 100000),
    seats: number(details.seats, "seats", 0, 100),
    doors: number(details.doors, "doors", 0, 12),
    engine_size: number(details.engineSize, "engineSize", 0, 100),
    fuel_type: string(details.fuelType, "fuelType", 40, true),
    fuel_economy: number(details.fuelEconomy, "fuelEconomy", 0, 1000),
    transmission: string(details.transmission, "transmission", 40, true),
    height: number(details.height, "height", 0, 100000),
    mileage: number(details.mileage, "mileage", 0, 10_000_000),
    year: number(details.year, "year", 1886, 2100),
  };
}

async function adminVehicle(env: RuntimeEnv, id: string) {
  const row = await env.DB.prepare("SELECT * FROM vehicles WHERE (id = ? OR slug = ?) AND deleted_at IS NULL")
    .bind(id, id).first<VehicleRow>();
  if (!row) throw new HttpError(404, "Vehicle not found");
  return row;
}

async function photos(env: RuntimeEnv, id?: string): Promise<ImageRow[]> {
  const result = id
    ? await env.DB.prepare("SELECT * FROM vehicle_images WHERE vehicle_id = ? ORDER BY position").bind(id).all<ImageRow>()
    : await env.DB.prepare("SELECT * FROM vehicle_images ORDER BY vehicle_id, position").all<ImageRow>();
  return result.results;
}

export async function authenticateAdmin(request: Request, env: RuntimeEnv): Promise<string> {
  // Static assets do not inject ctx.access into the Worker. Validate signed Access JWT here.
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new HttpError(503, "Admin Access is not configured");
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) throw new HttpError(401, "Admin sign-in required");
  let issuer: URL;
  try {
    issuer = new URL(env.ACCESS_TEAM_DOMAIN);
    if (issuer.protocol !== "https:") throw Error();
  } catch {
    throw new HttpError(503, "Admin Access is not configured");
  }
  try {
    const keys = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", issuer));
    const { payload } = await jwtVerify(token, keys, {
      issuer: issuer.origin,
      audience: env.ACCESS_AUD.split(",").map((part) => part.trim()),
    });
    if (typeof payload.email !== "string") throw Error("No email in Access identity");
    return payload.email;
  } catch {
    throw new HttpError(403, "Invalid Admin Access token");
  }
}

async function saveVehicle(request: Request, env: RuntimeEnv, id?: string): Promise<Response> {
  const payload = await readJsonObject(request);
  const values = vehicleFields(payload);
  const now = new Date().toISOString();
  if (!id) {
    const nameSlug = (values.name as string).normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = string(payload.slug ?? `${nameSlug}-${values.year || "vehicle"}`, "slug", 180);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new HttpError(400, "Invalid slug");
    const newId = crypto.randomUUID();
    const columns = { id: newId, slug, ...values, created_at: now, updated_at: now, deleted_at: null };
    const keys = Object.keys(columns);
    try {
      await env.DB.prepare(`INSERT INTO vehicles (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`)
        .bind(...Object.values(columns)).run();
    } catch (error) {
      if (String(error).includes("UNIQUE constraint")) throw new HttpError(409, "Slug already exists");
      throw error;
    }
    const row = await adminVehicle(env, newId);
    return json({ vehicle: vehicleDto(row, [], env.MEDIA_BASE_URL) }, 201);
  }
  const before = await adminVehicle(env, id);
  if (payload.slug !== undefined && payload.slug !== before.slug) {
    throw new HttpError(400, "Vehicle slugs are permanent; create a new vehicle or add a redirect");
  }
  const expected = string(payload.updatedAt, "updatedAt", 40);
  const updated = { ...values, updated_at: now };
  const columns = Object.keys(updated);
  const result = await env.DB.prepare(
    `UPDATE vehicles SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ? AND updated_at = ? AND deleted_at IS NULL`
  ).bind(...Object.values(updated), before.id, expected).run();
  if (!result.meta.changes) throw new HttpError(409, "Vehicle changed while you were editing; reload and review before saving");
  const row = await adminVehicle(env, before.id);
  return json({ vehicle: vehicleDto(row, await photos(env, row.id), env.MEDIA_BASE_URL) });
}

async function uploadImages(request: Request, env: RuntimeEnv, id: string): Promise<Response> {
  const row = await adminVehicle(env, id);
  // Two client-resized JPEGs keep uploads bounded and avoid server-side image processing.
  const declaredLength = Number(request.headers.get("Content-Length"));
  if (!Number.isInteger(declaredLength) || declaredLength < 1 || declaredLength > 9_000_000) {
    throw new HttpError(413, "Upload must declare a size under 9 MB");
  }
  const form = await request.formData();
  const large = form.get("large");
  const small = form.get("small");
  if (!(large instanceof File) || !(small instanceof File) || large.type !== "image/jpeg" || small.type !== "image/jpeg" ||
    large.size < 128 || small.size < 128 || large.size > 5_000_000 || small.size > 2_000_000) {
    throw new HttpError(400, "Upload two JPEG images: 1000px (up to 5 MB) and 400px (up to 2 MB)");
  }
  const width = number(Number(form.get("width")), "width", 100, 10000);
  const height = number(Number(form.get("height")), "height", 100, 10000);
  if (!width || !height) throw new HttpError(400, "Image dimensions required");
  const largeBytes = new Uint8Array(await large.arrayBuffer());
  const smallBytes = new Uint8Array(await small.arrayBuffer());
  const isJpeg = (data: Uint8Array) => data[0] === 0xff && data[1] === 0xd8 && data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9;
  if (!isJpeg(largeBytes) || !isJpeg(smallBytes)) throw new HttpError(400, "Invalid JPEG image");
  const hash = async (data: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data)))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
  const token = crypto.randomUUID();
  const base = `vehicles/${row.id}/${token}`;
  const smallKey = `${base}-400.${await hash(smallBytes)}.jpg`;
  const largeKey = `${base}-1000.${await hash(largeBytes)}.jpg`;
  await env.MEDIA.put(smallKey, smallBytes, { httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" } });
  try {
    await env.MEDIA.put(largeKey, largeBytes, { httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" } });
    const last = await env.DB.prepare("SELECT COALESCE(MAX(position), -1) AS position FROM vehicle_images WHERE vehicle_id = ?")
      .bind(row.id).first<{ position: number }>();
    const position = (last?.position ?? -1) + 1;
    await env.DB.prepare("INSERT INTO vehicle_images (vehicle_id, position, small_key, large_key, width, height, alt) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(row.id, position, smallKey, largeKey, width, height, row.name).run();
    return json({ vehicle: vehicleDto(row, await photos(env, row.id), env.MEDIA_BASE_URL) }, 201);
  } catch (error) {
    // Only objects from this failed request are removed; previously published URLs remain immutable.
    await Promise.allSettled([env.MEDIA.delete(smallKey), env.MEDIA.delete(largeKey)]);
    throw error;
  }
}

export async function adminApi(request: Request, env: RuntimeEnv, url: URL): Promise<Response> {
  const email = await authenticateAdmin(request, env);
  if (request.method !== "GET") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) throw new HttpError(403, "Invalid origin");
  }
  if (url.pathname === "/api/admin/me" && request.method === "GET") return json({ email });
  if (url.pathname === "/api/admin/vehicles") {
    if (request.method === "POST") return saveVehicle(request, env);
    if (request.method === "GET") {
      const [vehicles, images] = await Promise.all([
        env.DB.prepare("SELECT * FROM vehicles WHERE deleted_at IS NULL ORDER BY updated_at DESC").all<VehicleRow>(),
        photos(env),
      ]);
      return json({ vehicles: vehicles.results.map((row) => vehicleDto(row, images, env.MEDIA_BASE_URL)) });
    }
  }
  const orderPath = url.pathname.match(/^\/api\/admin\/vehicles\/([a-zA-Z0-9-]+)\/images\/order$/);
  if (orderPath && request.method === "PUT") {
    const row = await adminVehicle(env, orderPath[1]);
    const input = await readJsonObject(request, 4096);
    const existing = await photos(env, row.id);
    if (!Array.isArray(input.positions) || input.positions.length !== existing.length || input.positions.length > 50 ||
      !input.positions.every((position) => Number.isInteger(position)) ||
      !input.positions.every((position) => existing.some((image) => image.position === position)) ||
      new Set(input.positions).size !== input.positions.length) {
      throw new HttpError(400, "Photo order does not match the current photos; reload and try again");
    }
    const positions = input.positions as number[];
    // Two passes avoid collisions with the compound (vehicle_id, position) key.
    const changes = positions.flatMap((position, index) => [
      env.DB.prepare("UPDATE vehicle_images SET position = ? WHERE vehicle_id = ? AND position = ?")
        .bind(-index - 1, row.id, position),
    ]);
    for (let index = 0; index < positions.length; index++) {
      changes.push(env.DB.prepare("UPDATE vehicle_images SET position = ? WHERE vehicle_id = ? AND position = ?")
        .bind(index, row.id, -index - 1));
    }
    if (changes.length) await env.DB.batch(changes);
    return json({ vehicle: vehicleDto(row, await photos(env, row.id), env.MEDIA_BASE_URL) });
  }
  const imagePath = url.pathname.match(/^\/api\/admin\/vehicles\/([a-zA-Z0-9-]+)\/images(?:\/(\d+))?$/);
  if (imagePath) {
    const [, id, position] = imagePath;
    if (request.method === "POST" && !position) return uploadImages(request, env, id);
    if (request.method === "DELETE" && position) {
      const row = await adminVehicle(env, id);
      const result = await env.DB.prepare("DELETE FROM vehicle_images WHERE vehicle_id = ? AND position = ?")
        .bind(row.id, Number(position)).run();
      if (!result.meta.changes) throw new HttpError(404, "Image not found");
      // Keep old R2 object: published and cached HTML may still link to this immutable key.
      return json({ vehicle: vehicleDto(row, await photos(env, row.id), env.MEDIA_BASE_URL) });
    }
  }
  const match = url.pathname.match(/^\/api\/admin\/vehicles\/([a-zA-Z0-9-]+)$/);
  if (match) {
    const id = match[1];
    if (request.method === "GET") {
      const row = await adminVehicle(env, id);
      return json({ vehicle: vehicleDto(row, await photos(env, row.id), env.MEDIA_BASE_URL) });
    }
    if (request.method === "PUT") return saveVehicle(request, env, id);
    if (request.method === "DELETE") {
      const row = await adminVehicle(env, id);
      await env.DB.prepare("UPDATE vehicles SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
        .bind(new Date().toISOString(), new Date().toISOString(), row.id).run();
      return json({ ok: true });
    }
  }
  throw new HttpError(404, "Admin endpoint not found");
}

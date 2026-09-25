/** The public representation is also the schema of data/vehicles.json at build time. */
export type Vehicle = {
  id: string;
  slug: string;
  name: string;
  category: string;
  condition: string;
  sold: boolean;
  photos: Array<{
    position: number;
    url: string;
    url400: string;
    url1000: string;
    width: number | null;
    height: number | null;
    alt: string;
  }>;
  pricing: { hire: number | null; sales: number | null; lease: number | null };
  availability: { hire: boolean; sales: boolean; lease: boolean };
  promoted: { hire: boolean; sales: boolean; lease: boolean };
  details: {
    description: string;
    storage: { width: number | null; height: number | null; length: number | null };
    cargo: number | null;
    seats: number | null;
    doors: number | null;
    engineSize: number | null;
    fuelType: string | null;
    fuelEconomy: number | null;
    transmission: string | null;
    height: number | null;
    mileage: number | null;
    year: number | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type VehicleRow = Record<string, string | number | null> & {
  id: string;
  slug: string;
  name: string;
  category: string;
  condition: string;
  sold: number;
  pricing_hire: number | null;
  pricing_sales: number | null;
  pricing_lease: number | null;
  availability_hire: number;
  availability_sales: number;
  availability_lease: number;
  promoted_hire: number;
  promoted_sales: number;
  promoted_lease: number;
  description: string | null;
  storage_width: number | null;
  storage_height: number | null;
  storage_length: number | null;
  cargo: number | null;
  seats: number | null;
  doors: number | null;
  engine_size: number | null;
  fuel_type: string | null;
  fuel_economy: number | null;
  transmission: string | null;
  height: number | null;
  mileage: number | null;
  year: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ImageRow = Record<string, string | number | null> & {
  vehicle_id: string;
  position: number;
  small_key: string;
  large_key: string;
  width: number | null;
  height: number | null;
  alt: string | null;
};

function imageUrl(base: string | undefined, key: string): string {
  if (/^https?:\/\//i.test(key)) {
    let url: URL;
    try {
      url = new URL(key);
    } catch {
      throw new HttpError(500, "Invalid vehicle image URL");
    }
    // A short-lived live-site reference keeps preview photos working until copied to R2.
    // Never allow a database value to point visitor browsers at arbitrary hosts.
    if (url.protocol !== "https:" || url.host !== "moorlandselfdrive.co.uk" || url.username || url.password ||
      url.search || url.hash ||
      !/^\/images\/vehicles\/[a-f0-9]{24}\/[a-zA-Z0-9_-]+-(?:400|1000)\.jpe?g$/.test(url.pathname)) {
      throw new HttpError(500, "Invalid vehicle image URL");
    }
    return url.href;
  }
  if (!/^vehicles\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\.(?:jpe?g|webp)$/.test(key)) {
    throw new HttpError(500, "Invalid vehicle image key");
  }
  return base ? `${base.replace(/\/$/, "")}/${key}` : `/api/media/${key}`;
}

export function vehicleDto(row: VehicleRow, images: ImageRow[], mediaBase?: string): Vehicle {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    condition: row.condition,
    sold: !!row.sold,
    photos: images.filter((image) => image.vehicle_id === row.id).map((image) => {
      const url400 = imageUrl(mediaBase, image.small_key);
      const url1000 = imageUrl(mediaBase, image.large_key);
      return {
        position: image.position,
        url: url1000,
        url400,
        url1000,
        width: image.width,
        height: image.height,
        alt: image.alt || row.name,
      };
    }),
    pricing: { hire: row.pricing_hire, sales: row.pricing_sales, lease: row.pricing_lease },
    availability: {
      hire: !!row.availability_hire,
      sales: !!row.availability_sales,
      lease: !!row.availability_lease,
    },
    promoted: { hire: !!row.promoted_hire, sales: !!row.promoted_sales, lease: !!row.promoted_lease },
    details: {
      // New catalogue and admin descriptions are plain text; React escapes display content.
      description: row.description || "",
      storage: { width: row.storage_width, height: row.storage_height, length: row.storage_length },
      cargo: row.cargo,
      seats: row.seats,
      doors: row.doors,
      engineSize: row.engine_size,
      fuelType: row.fuel_type,
      fuelEconomy: row.fuel_economy,
      transmission: row.transmission,
      height: row.height,
      mileage: row.mileage,
      year: row.year,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function json(data: unknown, status = 200, cache = "no-store"): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function readJsonObject(request: Request, maxBytes = 32768): Promise<Record<string, unknown>> {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Expected application/json");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body required");
  let size = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Request body too large");
    }
    parts.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    body.set(part, offset);
    offset += part.byteLength;
  }
  try {
    const object: unknown = JSON.parse(new TextDecoder().decode(body));
    if (!object || typeof object !== "object" || Array.isArray(object)) throw Error();
    return object as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Invalid JSON object");
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

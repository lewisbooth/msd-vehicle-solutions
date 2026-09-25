import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Photo = { position: number; url: string; url400: string; width: number | null; height: number | null; alt: string };
type Vehicle = {
  id: string; slug: string; name: string; category: string; condition: string; sold: boolean;
  photos: Photo[]; createdAt: string; updatedAt: string;
  pricing: { hire: number | null; sales: number | null; lease: number | null };
  availability: { hire: boolean; sales: boolean; lease: boolean };
  promoted: { hire: boolean; sales: boolean; lease: boolean };
  details: {
    description: string; storage: { width: number | null; height: number | null; length: number | null };
    cargo: number | null; seats: number | null; doors: number | null; engineSize: number | null;
    fuelType: string | null; fuelEconomy: number | null; transmission: string | null;
    height: number | null; mileage: number | null; year: number | null;
  };
};

const categories: Array<[string, string]> = [
  ["van-small", "Small van"], ["van-medium", "Medium van"], ["van-large", "Large van"],
  ["van-luton", "Luton van"], ["car-economy", "Economy car"], ["car-hatchback", "Hatchback"],
  ["car-saloon", "Saloon car"], ["car-performance", "Performance car"], ["car-suv", "SUV"],
  ["car-truck", "Truck"], ["car-minibus", "Minibus"],
];
const services = ["hire", "sales", "lease"] as const;

function blankVehicle(): Vehicle {
  return {
    id: "", slug: "", name: "", category: "van-small", condition: "used", sold: false,
    photos: [], createdAt: "", updatedAt: "",
    pricing: { hire: null, sales: null, lease: null },
    availability: { hire: false, sales: false, lease: false },
    promoted: { hire: false, sales: false, lease: false },
    details: {
      description: "", storage: { width: null, height: null, length: null }, cargo: null,
      seats: 2, doors: 2, engineSize: null, fuelType: "diesel", fuelEconomy: null,
      transmission: "manual", height: null, mileage: null, year: new Date().getFullYear(),
    },
  };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...init });
  const result = await response.json().catch(() => ({ error: `Request failed (${response.status})` }));
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result as T;
}

async function resizeJpeg(file: File, longestSide: number): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, longestSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable in this browser");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => {
    if (result) resolve(result); else reject(new Error("Image conversion failed"));
  }, "image/jpeg", .85));
  return { blob, width, height };
}

function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const result = await api<{ vehicles: Vehicle[] }>("/api/admin/vehicles");
    setVehicles(result.vehicles);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await api<{ email: string }>("/api/admin/me");
        setUser(me.email);
        await refresh();
      } catch (failure) { setError(String(failure instanceof Error ? failure.message : failure)); }
    })();
  }, [refresh]);

  const edit = (vehicle: Vehicle) => { setSelected(structuredClone(vehicle)); setIsNew(false); setError(""); setNotice(""); };
  const update = (path: string[], value: string | number | boolean | null) => {
    setSelected((before) => {
      if (!before) return before;
      const next = structuredClone(before);
      let parent: Record<string, unknown> = next as unknown as Record<string, unknown>;
      for (const key of path.slice(0, -1)) parent = parent[key] as Record<string, unknown>;
      parent[path[path.length - 1]] = value;
      return next;
    });
  };
  const numeric = (path: string[], value: string) => update(path, value === "" ? null : Number(value));
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (failure) { setError(String(failure instanceof Error ? failure.message : failure)); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!selected) return;
    await run(async () => {
      const result = await api<{ vehicle: Vehicle }>(
        isNew ? "/api/admin/vehicles" : `/api/admin/vehicles/${selected.id}`,
        { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selected) }
      );
      setSelected(result.vehicle); setIsNew(false);
      await refresh();
      setNotice("Saved. Live API data updates now; prerendered search pages update after the next static build.");
    });
  };

  const upload = async (file?: File) => {
    if (!selected?.id || !file) return;
    await run(async () => {
      const [large, small] = await Promise.all([resizeJpeg(file, 1000), resizeJpeg(file, 400)]);
      const body = new FormData();
      body.append("large", large.blob, "large.jpg");
      body.append("small", small.blob, "small.jpg");
      body.append("width", String(large.width));
      body.append("height", String(large.height));
      const result = await api<{ vehicle: Vehicle }>(`/api/admin/vehicles/${selected.id}/images`, { method: "POST", body });
      setSelected(result.vehicle);
      await refresh();
      setNotice("Photo uploaded.");
    });
  };

  const removeImage = async (position: number) => {
    if (!selected || !window.confirm("Remove this photo from the vehicle?")) return;
    await run(async () => {
      const result = await api<{ vehicle: Vehicle }>(`/api/admin/vehicles/${selected.id}/images/${position}`, { method: "DELETE" });
      setSelected(result.vehicle);
      await refresh();
    });
  };

  const moveImage = async (index: number, direction: -1 | 1) => {
    if (!selected || index + direction < 0 || index + direction >= selected.photos.length) return;
    await run(async () => {
      const positions = selected.photos.map((photo) => photo.position);
      [positions[index], positions[index + direction]] = [positions[index + direction], positions[index]];
      const result = await api<{ vehicle: Vehicle }>(`/api/admin/vehicles/${selected.id}/images/order`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ positions }),
      });
      setSelected(result.vehicle);
      await refresh();
    });
  };

  const removeVehicle = async () => {
    if (!selected || !window.confirm(`Remove ${selected.name} from the public catalogue?`)) return;
    await run(async () => {
      await api(`/api/admin/vehicles/${selected.id}`, { method: "DELETE" });
      setSelected(null); await refresh(); setNotice("Vehicle removed from the public API.");
    });
  };

  const input = (label: string, path: string[], options?: { type?: string; min?: number; max?: number; step?: string }) => {
    let current: unknown = selected;
    for (const key of path) current = (current as Record<string, unknown>)?.[key];
    const numberField = options?.type === "number";
    return <label className="field" key={path.join(".")}>{label}
      <input type={options?.type || "text"} min={options?.min} max={options?.max} step={options?.step}
        value={current ?? ""} onChange={(event) => numberField
          ? numeric(path, event.target.value) : update(path, event.target.value)} />
    </label>;
  };

  const filtered = vehicles.filter((vehicle) => `${vehicle.name} ${vehicle.slug} ${vehicle.category}`.toLowerCase().includes(search.toLowerCase()));

  return <div className="min-h-screen">
    <header className="bg-slate-950 text-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
      <div><a href="/" className="text-xs uppercase tracking-[.2em] text-blue-200">Moorland Self Drive</a>
        <h1 className="text-2xl font-bold">Vehicle administration</h1></div>
      <span className="text-xs text-slate-300">{user || "Protected by Cloudflare Access"}</span>
    </div></header>
    <main className="mx-auto max-w-7xl px-5 py-8">
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>}
      {notice && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">{notice}</div>}
      {!user ? <div className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Admin access unavailable</h2>
        <p className="mt-2 text-slate-600">Sign in through Cloudflare Access. If this is a preview, Access and the preview database must be configured before edits are enabled.</p></div>
        : <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="self-start rounded-xl bg-white p-4 shadow-sm lg:sticky lg:top-6">
            <div className="flex items-center justify-between gap-3"><h2 className="font-bold">Vehicles ({vehicles.length})</h2>
              <button type="button" className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                onClick={() => { setSelected(blankVehicle()); setIsNew(true); setError(""); setNotice(""); }}>Add</button></div>
            <label className="sr-only" htmlFor="vehicle-search">Search vehicles</label>
            <input id="vehicle-search" placeholder="Search vehicles" value={search} onChange={(event) => setSearch(event.target.value)}
              className="my-4 w-full rounded-lg border border-slate-300 px-3 py-2" />
            <div className="max-h-[68vh] space-y-1 overflow-auto">
              {filtered.map((vehicle) => <button type="button" key={vehicle.id} onClick={() => edit(vehicle)}
                className={`flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-100 ${selected?.id === vehicle.id ? "bg-blue-50" : ""}`}>
                {vehicle.photos[0] ? <img src={vehicle.photos[0].url400} alt="" className="h-12 w-16 rounded object-cover" />
                  : <span className="h-12 w-16 rounded bg-slate-200" />}
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{vehicle.name}</span>
                  <span className="text-xs text-slate-500">{vehicle.details.year} · {vehicle.sold ? "Sold" : "Active"}</span></span>
              </button>)}
            </div>
          </aside>
          {selected ? <section className="rounded-xl bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{isNew ? "Add vehicle" : `Edit ${selected.name}`}</h2>
              {!isNew && <a className="text-sm text-blue-700 underline" href={`/vehicles/${selected.slug}`} target="_blank" rel="noreferrer">View public page</a>}</div>
              <div className="flex gap-2"><button disabled={busy} type="button" onClick={save}
                className="rounded-lg bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800">{busy ? "Working…" : "Save vehicle"}</button>
                {!isNew && <button disabled={busy} type="button" onClick={removeVehicle}
                  className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700">Remove</button>}</div></div>
            <div className="space-y-8">
              <fieldset><legend className="mb-3 text-lg font-semibold">Details</legend>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {input("Name", ["name"])}
                  <label className="field">Category<select value={selected.category} onChange={(event) => update(["category"], event.target.value)}>
                    {categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select></label>
                  <label className="field">Condition<select value={selected.condition} onChange={(event) => update(["condition"], event.target.value)}>
                    <option value="used">Used</option><option value="new">New</option></select></label>
                  {input("Year", ["details", "year"], { type: "number", min: 1886, max: 2100 })}
                  {input("Mileage", ["details", "mileage"], { type: "number", min: 0 })}
                  {input("Seats", ["details", "seats"], { type: "number", min: 0 })}
                  {input("Doors", ["details", "doors"], { type: "number", min: 0 })}
                  {input("Engine size (L)", ["details", "engineSize"], { type: "number", min: 0, step: "any" })}
                  {input("Fuel economy (mpg)", ["details", "fuelEconomy"], { type: "number", min: 0, step: "any" })}
                  {input("Fuel type", ["details", "fuelType"])}
                  {input("Transmission", ["details", "transmission"])}
                  {input("Overall height (mm)", ["details", "height"], { type: "number", min: 0, step: "any" })}
                  {input("Cargo / payload (kg)", ["details", "cargo"], { type: "number", min: 0, step: "any" })}
                  {input("Storage width (mm)", ["details", "storage", "width"], { type: "number", min: 0, step: "any" })}
                  {input("Storage height (mm)", ["details", "storage", "height"], { type: "number", min: 0, step: "any" })}
                  {input("Storage length (mm)", ["details", "storage", "length"], { type: "number", min: 0, step: "any" })}
                </div>
                <label className="field mt-4">Description (plain text)<textarea rows={6} value={selected.details.description}
                  onChange={(event) => update(["details", "description"], event.target.value)} /></label>
                <label className="check mt-4"><input type="checkbox" checked={selected.sold} onChange={(event) => update(["sold"], event.target.checked)} />Sold</label>
              </fieldset>
              <fieldset><legend className="mb-3 text-lg font-semibold">Pricing and visibility</legend>
                <div className="grid gap-4 md:grid-cols-3">{services.map((type) => <div key={type} className="rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-3 font-semibold capitalize">{type === "sales" ? "Sales" : type}</h3>
                  {input("Price (£)" + (type === "hire" ? " / day" : type === "lease" ? " / month" : ""), ["pricing", type], { type: "number", min: -1, step: "1" })}
                  <label className="check mt-4"><input type="checkbox" checked={selected.availability[type]} onChange={(event) => update(["availability", type], event.target.checked)} />Available</label>
                  <label className="check mt-2"><input type="checkbox" checked={selected.promoted[type]} onChange={(event) => update(["promoted", type], event.target.checked)} />Promoted</label>
                </div>)}</div>
                <p className="mt-3 text-xs text-slate-500">A sold vehicle is hidden from listings even if an old availability flag remains on. A sales price of −1 means price on application.</p>
              </fieldset>
              <fieldset><legend className="mb-3 text-lg font-semibold">Photos</legend>
                <div className="flex flex-wrap gap-3">{selected.photos.map((photo, index) => <div key={photo.url} className="rounded-xl border border-slate-200 p-2">
                  <img src={photo.url400} alt={photo.alt} className="h-32 w-44 rounded object-cover" />
                  <div className="mt-2 flex items-center gap-3 text-sm"><button type="button" disabled={busy || index === 0}
                    className="text-blue-700 underline" onClick={() => moveImage(index, -1)}>Earlier</button>
                    <button type="button" disabled={busy || index === selected.photos.length - 1}
                      className="text-blue-700 underline" onClick={() => moveImage(index, 1)}>Later</button>
                    <button type="button" disabled={busy} className="text-red-700 underline" onClick={() => removeImage(photo.position)}>Remove</button></div>
                </div>)}</div>
                {selected.id ? <label className="field mt-4 max-w-sm">Add a photo (JPEG, PNG or WebP)
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => {
                    const file = event.target.files?.[0]; void upload(file); event.target.value = "";
                  }} /></label> : <p className="text-sm text-slate-500">Save the vehicle before adding photos.</p>}
                <p className="mt-2 text-sm text-slate-500">Your browser generates 400px and 1000px JPEGs before uploading.</p>
              </fieldset>
            </div>
          </section> : <section className="self-start rounded-xl bg-white p-8 text-slate-600 shadow-sm">Select a vehicle or add a new one.</section>}
        </div>}
    </main>
  </div>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);

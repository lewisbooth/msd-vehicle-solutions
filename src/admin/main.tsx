import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import PhotoManager, { type Photo } from "./PhotoManager";
import "./styles.css";

type Vehicle = {
  id: string; slug: string; name: string; category: string; condition: string; sold: boolean;
  photos: Photo[]; createdAt: string; updatedAt: string;
  pricing: { hire: number | null; sales: number | null; lease: number | null };
  poa: { hire: boolean; sales: boolean; lease: boolean };
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
const services = [["hire", "Hire", "Daily price (£)"], ["sales", "Sales", "Sale price (£)"], ["lease", "Leasing", "Monthly price (£)"]] as const;
function blankVehicle(): Vehicle {
  return {
    id: "", slug: "", name: "", category: "van-small", condition: "used", sold: false,
    photos: [], createdAt: "", updatedAt: "",
    pricing: { hire: null, sales: null, lease: null },
    poa: { hire: false, sales: false, lease: false },
    availability: { hire: false, sales: false, lease: false },
    promoted: { hire: false, sales: false, lease: false },
    details: {
      description: "", storage: { width: null, height: null, length: null }, cargo: null,
      seats: 2, doors: 2, engineSize: null, fuelType: "diesel", fuelEconomy: null,
      transmission: "manual", height: null, mileage: null, year: new Date().getFullYear(),
    },
  };
}
function fieldsSnapshot(vehicle: Vehicle) {
  const { photos, updatedAt, createdAt, ...fields } = vehicle;
  return JSON.stringify(fields);
}
class SessionError extends Error {}
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("X-Requested-With", "XMLHttpRequest");
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...init, headers });
  if (response.status === 401 || response.status === 403 || (response.headers.get("content-type") || "").includes("text/html")) {
    throw new SessionError("Your session has expired. Sign in again in a new tab, then retry here. Your unsaved details are still here.");
  }
  const result = await response.json().catch(() => { throw new Error(`Unable to read the response (${response.status}). Please try again.`); });
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result as T;
}
async function preparePhoto(file: File): Promise<FormData> {
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { throw new Error("This image could not be opened. Choose a JPEG, PNG or WebP photo."); }
  try {
    const resize = async (longestSide: number) => {
      const scale = Math.min(1, longestSide / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      if (longestSide === 1000 && (width < 100 || height < 100)) throw new Error("Choose a larger photo with both sides at least 100 pixels after resizing.");
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is unavailable in this browser.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => {
        if (result) resolve(result); else reject(new Error("This photo could not be converted. Try another image."));
      }, "image/jpeg", .85));
      return { blob, width, height };
    };
    const [large, small] = await Promise.all([resize(1000), resize(400)]);
    const body = new FormData();
    body.append("large", large.blob, "large.jpg"); body.append("small", small.blob, "small.jpg");
    body.append("width", String(large.width)); body.append("height", String(large.height));
    return body;
  } finally { bitmap.close(); }
}
function ArrowLeft() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m12 5-7 7 7 7M5 12h14" /></svg>;
}
function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [baseline, setBaseline] = useState<Vehicle | null>(null);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [notice, setNotice] = useState("");
  const [operation, setOperation] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const lock = useRef(false);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const busy = Boolean(operation);
  const isNew = selected !== null && !selected.id;
  const dirty = Boolean(selected && baseline && fieldsSnapshot(selected) !== fieldsSnapshot(baseline));

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await api<{ email: string }>("/api/admin/me");
        const result = await api<{ vehicles: Vehicle[] }>("/api/admin/vehicles");
        if (active) { setUser(me.email); setVehicles(result.vehicles); }
      } catch (failure) {
        if (active) { setError(failure instanceof Error ? failure.message : String(failure)); setSessionExpired(failure instanceof SessionError); }
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);

  const choose = (vehicle: Vehicle | null) => {
    if (lock.current || (dirty && !window.confirm("Discard your unsaved vehicle details? Photo changes are already saved."))) return;
    setSelected(vehicle ? structuredClone(vehicle) : null);
    setBaseline(vehicle ? structuredClone(vehicle) : null);
    setError(""); setNotice(""); setSessionExpired(false);
    requestAnimationFrame(() => {
      if (vehicle) editorHeading.current?.focus(); else searchInput.current?.focus();
    });
  };
  const update = (path: string[], value: string | number | boolean | null) => {
    setNotice("");
    setSelected(before => {
      if (!before || lock.current) return before;
      const next = structuredClone(before);
      let parent = next as unknown as Record<string, unknown>;
      for (const key of path.slice(0, -1)) parent = parent[key] as Record<string, unknown>;
      parent[path[path.length - 1]] = value;
      return next;
    });
  };
  const run = async (name: string, action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setOperation(name); setError(""); setNotice(""); setSessionExpired(false);
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); setSessionExpired(failure instanceof SessionError); }
    finally { lock.current = false; setOperation(""); setUploadProgress(""); }
  };
  const updateCatalogue = (vehicle: Vehicle) => setVehicles(before => before.some(item => item.id === vehicle.id)
    ? before.map(item => item.id === vehicle.id ? vehicle : item) : [vehicle, ...before]);
  const applyPhotos = (vehicle: Vehicle) => {
    // Photo writes are immediate; never replace unsaved details or their concurrency token.
    setSelected(before => before?.id === vehicle.id ? { ...before, photos: vehicle.photos } : before);
    setBaseline(before => before?.id === vehicle.id ? { ...before, photos: vehicle.photos } : before);
    updateCatalogue(vehicle);
  };
  const save = async () => {
    if (!selected) return;
    await run("save", async () => {
      const payload = isNew ? { ...selected, slug: undefined } : selected;
      const result = await api<{ vehicle: Vehicle }>(isNew ? "/api/admin/vehicles" : `/api/admin/vehicles/${selected.id}`, {
        method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      setSelected(result.vehicle); setBaseline(structuredClone(result.vehicle)); updateCatalogue(result.vehicle);
      setNotice(isNew ? "Vehicle created. You can now add photos." : "Vehicle saved. Your website is up to date.");
    });
  };
  const upload = async (files: File[]) => {
    if (!selected?.id || !files.length) return;
    await run("upload", async () => {
      const invalid = files.find(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) && !(file.type === "" && /\.(jpe?g|png|webp)$/i.test(file.name)));
      if (invalid) throw new Error(`${invalid.name}: choose JPEG, PNG or WebP photos.`);
      if (selected.photos.length + files.length > 50) throw new Error("A vehicle can have up to 50 photos. Remove a photo before adding more.");
      let complete = 0;
      for (const file of files) {
        setUploadProgress(`Uploading photo ${complete + 1} of ${files.length}…`);
        try {
          const body = await preparePhoto(file);
          const result = await api<{ vehicle: Vehicle }>(`/api/admin/vehicles/${selected.id}/images`, { method: "POST", body });
          applyPhotos(result.vehicle); complete++;
        } catch (failure) {
          const message = `${complete ? `${complete} photo${complete === 1 ? "" : "s"} added. ` : ""}${file.name}: ${failure instanceof Error ? failure.message : String(failure)}`;
          throw failure instanceof SessionError ? new SessionError(message) : new Error(message);
        }
      }
      setNotice(`${complete} photo${complete === 1 ? "" : "s"} added.${dirty ? " Your other edits are still unsaved." : ""}`);
    });
  };
  const removeImage = async (position: number) => {
    if (!selected || lock.current || !window.confirm("Remove this photo from the vehicle?")) return;
    await run("photo", async () => {
      const result = await api<{ vehicle: Vehicle }>(`/api/admin/vehicles/${selected.id}/images/${position}`, { method: "DELETE" });
      applyPhotos(result.vehicle); setNotice("Photo removed.");
    });
  };
  const moveImage = async (index: number, direction: -1 | 1) => {
    if (!selected || index + direction < 0 || index + direction >= selected.photos.length) return;
    await run("photo", async () => {
      const positions = selected.photos.map(photo => photo.position);
      [positions[index], positions[index + direction]] = [positions[index + direction], positions[index]];
      const result = await api<{ vehicle: Vehicle }>(`/api/admin/vehicles/${selected.id}/images/order`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ positions }),
      });
      applyPhotos(result.vehicle); setNotice("Photo order saved.");
    });
  };
  const removeVehicle = async () => {
    if (!selected?.id || lock.current || !window.confirm(`Remove ${selected.name} from the public catalogue?${dirty ? " Unsaved details will be discarded." : ""}`)) return;
    await run("remove", async () => {
      await api(`/api/admin/vehicles/${selected.id}`, { method: "DELETE" });
      setVehicles(before => before.filter(item => item.id !== selected.id));
      setSelected(null); setBaseline(null); setNotice("Vehicle removed from the catalogue.");
      requestAnimationFrame(() => searchInput.current?.focus());
    });
  };
  const input = (label: string, path: string[], options?: { min?: number; max?: number; integer?: boolean; required?: boolean; maxLength?: number; disabled?: boolean }) => {
    let current: unknown = selected;
    for (const key of path) current = (current as Record<string, unknown>)?.[key];
    const numberField = options?.min !== undefined;
    return <label className="field" key={path.join(".")}><span>{label}{options?.required && <span className="required-hint"> required</span>}</span>
      <input name={path.join(".")} type={numberField ? "number" : "text"} inputMode={numberField ? options?.integer ? "numeric" : "decimal" : undefined}
        min={options?.min} max={options?.max} step={numberField ? options?.integer ? "1" : "any" : undefined}
        required={options?.required} maxLength={options?.maxLength} disabled={options?.disabled} value={current ?? ""}
        onChange={event => update(path, numberField ? event.target.value === "" ? null : Number(event.target.value) : event.target.value)} />
    </label>;
  };
  const feedback = <>
    {error && <div role="alert" className="feedback feedback-error">{error}{sessionExpired && <a href="/admin/" target="_blank" rel="noreferrer">Sign in again ↗</a>}</div>}
    {notice && <div role="status" className="feedback feedback-success">{notice}</div>}
  </>;
  const filtered = vehicles.filter(vehicle => `${vehicle.name} ${vehicle.slug} ${categories.find(([value]) => value === vehicle.category)?.[1]}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="admin-app">
    <header className="app-header"><div className="header-inner">
      <div><a href="/" target="_blank" rel="noreferrer" className="brand-link">Moorland Self Drive ↗</a><h1>Vehicle administration</h1></div>
      {user && <div className="account-controls"><div className="signed-in"><span>Signed in</span><strong>{user}</strong></div>
        <button type="button" className="button logout-button" disabled={busy} title="Log out of Cloudflare Access across your applications"
          onClick={() => window.location.assign("/cdn-cgi/access/logout")}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 4H4v16h5m6-13 5 5-5 5m-5-5h10" /></svg>Log out
        </button></div>}
    </div></header>
    <main className={`admin-main ${selected ? "has-selection" : ""}`}>
      {loading ? <section className="state-panel" role="status"><span className="loading-dot" />Loading your vehicles…</section>
      : !user ? <section className="state-panel"><h2>We couldn’t load your vehicles</h2>{feedback}<p>Check your connection or sign in again, then retry.</p><button type="button" className="button button-primary" onClick={() => window.location.reload()}>Retry</button></section>
      : <>
        {!selected && feedback}
        <div className="admin-layout">
          <aside className="catalogue-panel" aria-label="Vehicle catalogue">
            <div className="catalogue-heading"><div><h2>Vehicles <span className="count-badge">{vehicles.length}</span></h2><p>Manage your public catalogue</p></div>
              <button type="button" className="button button-primary add-button" disabled={busy} onClick={() => choose(blankVehicle())}><span aria-hidden="true">+</span> Add vehicle</button></div>
            <label className="search-field"><span className="sr-only">Search vehicles</span><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
              <input ref={searchInput} type="search" placeholder="Search vehicles…" value={search} onChange={event => setSearch(event.target.value)} /></label>
            <div className="vehicle-list">
              {filtered.length ? filtered.map(vehicle => <button type="button" key={vehicle.id} disabled={busy} onClick={() => { if (selected?.id !== vehicle.id) choose(vehicle); }}
                aria-current={selected?.id === vehicle.id ? "true" : undefined} className="vehicle-row">
                <span className="vehicle-thumbnail">{vehicle.photos[0] ? <img src={vehicle.photos[0].url400} alt="" loading="lazy" /> : <span>No photo</span>}</span>
                <span className="vehicle-summary"><strong>{vehicle.name}</strong><span>{[vehicle.details.year, vehicle.sold ? "Sold" : Object.values(vehicle.availability).some(Boolean) ? "Listed" : "Unlisted"].filter(Boolean).join(" · ")}</span></span>
                <span className="row-chevron" aria-hidden="true">›</span>
              </button>) : <div className="list-empty"><strong>{search ? "No matching vehicles" : "Your catalogue is empty"}</strong><p>{search ? "Try another name or category." : "Add your first vehicle to get started."}</p>{search && <button type="button" className="button button-secondary" onClick={() => setSearch("")}>Clear search</button>}</div>}
            </div>
          </aside>
          {selected ? <form className="editor" onSubmit={event => { event.preventDefault(); void save(); }}>
            <div className="editor-heading"><button type="button" className="button button-secondary mobile-back" disabled={busy} onClick={() => choose(null)}><ArrowLeft />Vehicles</button>
              <div className="editor-title"><p className="eyebrow">{isNew ? "New vehicle" : "Vehicle details"}</p><h2 ref={editorHeading} tabIndex={-1}>{isNew ? "Add a vehicle" : baseline?.name}</h2></div>
              {!isNew && <a className="public-link" href={`/vehicles/${selected.slug}`} target="_blank" rel="noreferrer">View on website ↗</a>}
            </div>
            <div className="editor-body">
              <fieldset disabled={busy} className="form-section"><legend>Overview</legend><p className="section-help">The essentials customers see on your website.</p>
                <div className="field-grid"><div className="full-width">{input("Vehicle name", ["name"], { required: true, maxLength: 150 })}</div>
                  <label className="field">Category<select value={selected.category} onChange={event => update(["category"], event.target.value)}>{categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                  <label className="field">Condition<select value={selected.condition} onChange={event => update(["condition"], event.target.value)}><option value="used">Used</option><option value="new">New</option></select></label>
                  {input("Year", ["details", "year"], { min: 1886, max: 2100, integer: true })}
                  {input("Mileage (miles)", ["details", "mileage"], { min: 0, max: 10_000_000, integer: true })}
                  <label className="field full-width">Description<textarea rows={5} maxLength={12000} value={selected.details.description} placeholder="Describe the vehicle, its condition and key features…" onChange={event => update(["details", "description"], event.target.value)} /></label>
                </div>
                <label className="check sold-check"><input type="checkbox" checked={selected.sold} onChange={event => update(["sold"], event.target.checked)} /><span><strong>Mark as sold</strong><small>Shows a Sold badge in Sales and hides this vehicle from Hire and Leasing.</small></span></label>
              </fieldset>
              <fieldset disabled={busy} className="form-section"><legend>Pricing & visibility</legend><p className="section-help">POA hides the price on your website and keeps the amount saved here. A blank price also shows as POA.</p>
                <div className="pricing-grid">{services.map(([type, title, label]) => <div className="price-card" key={type}><h3>{title}</h3>
                  {input(label, ["pricing", type], { min: 0, max: 1_000_000, disabled: selected.poa[type] })}
                  <label className="check"><input type="checkbox" checked={selected.poa[type]} onChange={event => update(["poa", type], event.target.checked)} />Price on application</label>
                  <div className="price-toggles"><label className="check"><input type="checkbox" checked={selected.availability[type]} onChange={event => update(["availability", type], event.target.checked)} />Show in {title}</label>
                    <label className="check"><input type="checkbox" checked={selected.promoted[type]} onChange={event => update(["promoted", type], event.target.checked)} />Feature this vehicle</label></div>
                </div>)}</div><p className="field-hint">Featured vehicles appear before other vehicles in featured sections.</p>
              </fieldset>
              <PhotoManager photos={selected.photos} disabled={busy} canUpload={Boolean(selected.id)} uploadProgress={uploadProgress}
                onUpload={files => void upload(files)} onRemove={position => void removeImage(position)} onMove={(index, direction) => void moveImage(index, direction)} />
              <fieldset disabled={busy} className="form-section"><legend>Specifications</legend><p className="section-help">Leave any unknown details blank.</p>
                <div className="field-grid specifications-grid">
                  {input("Seats", ["details", "seats"], { min: 0, max: 100, integer: true })}
                  {input("Doors", ["details", "doors"], { min: 0, max: 12, integer: true })}
                  {input("Engine size (L)", ["details", "engineSize"], { min: 0, max: 100 })}
                  {input("Fuel economy (mpg)", ["details", "fuelEconomy"], { min: 0, max: 1000 })}
                  {input("Fuel type", ["details", "fuelType"], { maxLength: 40 })}
                  {input("Transmission", ["details", "transmission"], { maxLength: 40 })}
                </div>
                <h3 className="subsection-title">Dimensions & payload</h3><div className="field-grid specifications-grid">
                  {input("Overall height (mm)", ["details", "height"], { min: 0, max: 100000 })}
                  {input("Payload (kg)", ["details", "cargo"], { min: 0, max: 100000 })}
                  {input("Load width (mm)", ["details", "storage", "width"], { min: 0, max: 100000 })}
                  {input("Load height (mm)", ["details", "storage", "height"], { min: 0, max: 100000 })}
                  {input("Load length (mm)", ["details", "storage", "length"], { min: 0, max: 100000 })}
                </div>
              </fieldset>
              {!isNew && <div className="remove-section"><div><h3>Remove vehicle</h3><p>Remove this vehicle and its listing from the website.</p></div><button type="button" className="button button-danger" disabled={busy} onClick={() => void removeVehicle()}>Remove vehicle</button></div>}
            </div>
            <footer className="save-bar"><div className="save-feedback">{feedback}<p className={dirty ? "save-state is-dirty" : "save-state"}>{busy ? uploadProgress || (operation === "save" ? "Saving vehicle…" : "Saving changes…") : dirty ? "Unsaved vehicle details" : isNew ? "Save this vehicle to add photos" : "All vehicle details saved"}</p></div>
              <div className="save-actions">{dirty && <button type="button" className="button button-secondary" disabled={busy} onClick={() => { if (baseline && window.confirm("Discard your unsaved vehicle details? Photo changes are already saved.")) { setSelected(structuredClone(baseline)); setNotice(""); setError(""); } }}>Discard</button>}
                <button type="submit" disabled={busy || (!dirty && !isNew)} className="button button-primary">{operation === "save" ? "Saving…" : isNew ? "Create vehicle" : "Save vehicle"}</button></div>
            </footer>
          </form> : <section className="editor-placeholder"><svg aria-hidden="true" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 8h8M8 12h8M8 16h4" /></svg><h2>Your vehicles, at a glance</h2><p>Choose a vehicle to update its details, pricing and photos, or add a new one.</p></section>}
        </div>
      </>}
    </main>
  </div>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);

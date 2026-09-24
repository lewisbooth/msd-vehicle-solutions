import React, { useEffect, useState } from 'react';
import { categories, coverImages, pages, serviceCards } from './data.jsx';

const phone = '01782 517782';
const phoneLink = 'tel:+441782517782';
const address = ['Moorland Self Drive', 'Childerplay Road', 'Knypersley', 'Stoke-on-Trent', 'ST8 7PZ'];
const typeNames = { hire: 'Hire', lease: 'Lease', sales: 'Sale' };
const safeArray = value => Array.isArray(value) ? value : [];
const money = value => Number(value) > 0 && value !== null && value !== ''
  ? `£${Number(value).toLocaleString('en-GB')}` : 'POA';
const sortablePrice = (vehicle, type) => Number(vehicle.pricing?.[type]) > 0
  ? Number(vehicle.pricing[type]) : null;
const categoryName = value => categories.find(([key]) => key === value)?.[1] || value || 'Vehicle';
const plain = value => String(value || '').replace(/<\s*br\s*\/?\s*>|<\s*\/p\s*>/gi, '\n')
  .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
const firstPhoto = vehicle => safeArray(vehicle?.photos)[0];
const photoUrl = (vehicle, size = '400') => {
  const photo = firstPhoto(vehicle);
  if (typeof photo === 'string') return `/images/vehicles/${vehicle.id || vehicle._id}/${photo}-${size}.jpg`;
  return (size === '1000' ? photo?.url1000 : photo?.url400) || photo?.url || '/images/vehicles/vehicle-photo-default.png';
};
const getFilters = () => {
  if (typeof window === 'undefined') return { sort: 'price-low', size: 'all', seats: 'all', fuel: 'all' };
  const params = new URLSearchParams(window.location.search);
  return { sort: params.get('sort') || 'price-low', size: params.get('size') || 'all',
    seats: params.get('seats') || 'all', fuel: params.get('fuel') || 'all' };
};

export function filterVehicles(list, type, filters) {
  return safeArray(list).filter(vehicle => {
    if (!vehicle.availability?.[type] || (type !== 'sales' && vehicle.sold)) return false;
    if (filters.size === 'all-cars' && !vehicle.category?.startsWith('car-')) return false;
    if (filters.size === 'all-vans' && !vehicle.category?.startsWith('van-')) return false;
    if (filters.size && !['all', 'all-cars', 'all-vans'].includes(filters.size) && vehicle.category !== filters.size) return false;
    const seats = Number(vehicle.details?.seats);
    if (filters.seats === '4+' && seats < 4) return false;
    if (filters.seats && !['all', '4+'].includes(filters.seats) && seats !== Number(filters.seats)) return false;
    if (filters.fuel && filters.fuel !== 'all' && String(vehicle.details?.fuelType || '').toLowerCase() !== filters.fuel) return false;
    return true;
  }).sort((a, b) => {
    const aPrice = sortablePrice(a, type), bPrice = sortablePrice(b, type);
    if (aPrice === null) return bPrice === null ? 0 : 1;
    if (bPrice === null) return -1;
    return filters.sort === 'price-high' ? bPrice - aPrice : aPrice - bPrice;
  });
}

function Header({ path }) {
  const [open, setOpen] = useState(false);
  const links = [['/', 'Hire'], ['/sales', 'Sales'], ['/leasing', 'Leasing'], ['/customs', 'Custom vehicles'], ['/servicing', 'Servicing'], ['/contact', 'Contact']];
  const active = path === '/' ? '/' : path.startsWith('/vehicles/listing/')
    ? ({ hire: '/', sales: '/sales', lease: '/leasing' }[path.split('/')[3]] || '')
    : links.find(([href]) => href !== '/' && path.startsWith(href))?.[0] || '';
  return <header className="site-header">
    <div className="shell header-inner">
      <a href="/" aria-label="Moorland Self Drive home" className="brand">
        <img src={path.startsWith('/customs') ? '/images/logos/msd-custom-commercials-logo-white.svg' : '/images/logos/msd-logo-white.svg'} alt="Moorland Self Drive" width="178" height="89" />
      </a>
      <button className="menu-toggle" type="button" aria-expanded={open} aria-controls="primary-nav" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'} <span aria-hidden="true">{open ? '×' : '☰'}</span></button>
      <nav id="primary-nav" aria-label="Main navigation" className={`primary-nav ${open ? 'is-open' : ''}`}>
        {links.map(([href, label]) => <a key={href} href={href} aria-current={active === href ? 'page' : undefined}>{label}</a>)}
      </nav>
      <a className="header-phone" href={phoneLink}><span>Call us today</span><strong>{phone}</strong></a>
    </div>
  </header>;
}

function Hero({ path, heading, eyebrow, lead }) {
  const image = coverImages[path];
  if (!image) return <div className="page-title shell"><span className="eyebrow">{eyebrow || 'Moorland Self Drive'}</span><h1>{heading}</h1>{lead && <p>{lead}</p>}</div>;
  return <section className="hero">
    <picture className="hero-image"><source media="(max-width: 700px)" srcSet={`/images/cover-images/${image[1]}`} /><img src={`/images/cover-images/${image[0]}`} width="1500" height="800" alt="" fetchPriority="high" /></picture>
    <div className="hero-shade" /><div className="shell hero-content"><span className="eyebrow">{eyebrow}</span><h1>{heading}</h1><p>{lead}</p><div className="hero-actions"><a className="btn btn-green" href={path === '/' ? '/vehicles/listing/hire' : path === '/sales' ? '/vehicles/listing/sales' : path === '/leasing' ? '/vehicles/listing/lease' : '/contact'}>{path === '/' || path === '/sales' || path === '/leasing' ? 'Explore vehicles' : 'Enquire today'} <span aria-hidden="true">↗</span></a><a className="hero-phone" href={phoneLink}>Or call {phone}</a></div></div>
  </section>;
}

function Quote() {
  const prices = {
    van: { 'van-small': [75, 300], 'van-medium': [100, 400], 'van-large': [125, 480], 'van-luton': [150, 500] },
    car: { 'car-economy': [55, 220], 'car-saloon': [75, 260], 'car-suv': [90, 360], 'car-truck': [120, 500] }
  };
  const [kind, setKind] = useState('van');
  const [size, setSize] = useState('van-small');
  const [period, setPeriod] = useState(0);
  const options = kind === 'van' ? [['van-small','Small'],['van-medium','Medium'],['van-large','Large'],['van-luton','Luton']] : [['car-economy','Economy'],['car-saloon','Saloon'],['car-suv','SUV'],['car-truck','Truck']];
  return <div className="quote-box"><span className="eyebrow">Plan your journey</span><h2>Instant hire quote</h2>
    <fieldset><legend>Vehicle type</legend><div className="segmented">{[['van','Van'],['car','Car']].map(([value,label]) => <button type="button" key={value} aria-pressed={kind===value} onClick={() => { setKind(value); setSize(value === 'van' ? 'van-small' : 'car-economy'); }}>{label}</button>)}</div></fieldset>
    <fieldset><legend>{kind === 'van' ? 'Van size' : 'Car size'} {kind === 'van' && <a href="/van-sizes">Size guide ↗</a>}</legend><div className="option-grid">{options.map(([value,label]) => <button type="button" key={value} aria-pressed={size===value} onClick={() => setSize(value)}>{label}</button>)}</div></fieldset>
    <fieldset><legend>Duration</legend><div className="segmented">{['Daily','Weekly'].map((label,index) => <button type="button" key={label} aria-pressed={period === index} onClick={() => setPeriod(index)}>{label}</button>)}</div></fieldset>
    <div className="quote-price"><span>Prices start from</span><strong>£{prices[kind][size][period]}</strong><span>/{period === 0 ? 'day' : 'week'} inc. VAT</span></div>
    <a className="btn btn-blue quote-cta" href={phoneLink}>Call to book <span aria-hidden="true">↗</span></a><p className="fine-print">Indicative starting price. Confirm availability and current pricing when booking.</p>
  </div>;
}

function OpeningHours() {
  return <section className="side-panel"><span className="eyebrow">Visit us</span><h3>Opening hours</h3><dl className="hours"><div><dt>Mon – Fri</dt><dd>8:30 – 18:00</dd></div><div><dt>Saturday</dt><dd>8:30 – 13:00<br/>17:00 – 18:00</dd></div><div><dt>Sunday</dt><dd>8:30 – 09:00<br/>17:00 – 18:00</dd></div></dl><a className="text-link" href="/contact">Find us and get in touch →</a></section>;
}

function VehicleCard({ vehicle, type = 'hire' }) {
  const price = money(vehicle.pricing?.[type]);
  return <a className="vehicle-card" href={`/vehicles/${encodeURIComponent(vehicle.slug)}?ref=${type}`}>
    <div className="vehicle-photo"><img src={photoUrl(vehicle)} alt={firstPhoto(vehicle)?.alt || vehicle.name} width={firstPhoto(vehicle)?.width || 400} height={firstPhoto(vehicle)?.height || 267} loading="lazy" />{vehicle.sold && <span className="sold-badge">Sold</span>}</div>
    <div className="vehicle-card-body"><div className="vehicle-title-line"><h3>{vehicle.name}</h3><span>{vehicle.details?.year || ''}</span></div><p className="vehicle-kind">{categoryName(vehicle.category)}</p><div className="vehicle-card-bottom"><p><strong>{price}</strong>{price !== 'POA' && type !== 'sales' && <small> /{type === 'hire' ? 'day' : 'month'}</small>}</p><span className="card-arrow" aria-hidden="true">↗</span></div></div>
  </a>;
}

function Featured({ type, title, initialVehicles = [] }) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/home', { signal: controller.signal }).then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!Array.isArray(data?.featured?.[type])) return;
        setVehicles(previous => {
          const fresh = data.featured[type];
          const pinned = previous.slice(0,3).map(item => fresh.find(vehicle => vehicle.slug === item.slug));
          // Keep the current published feature order while replacing its live
          // prices and status. A newly published catalogue can change the order.
          if (pinned.length && pinned.every(Boolean)) return pinned;
          return fresh;
        });
      }).catch(() => {});
    return () => controller.abort();
  }, [type]);
  const available = vehicles.filter(vehicle => !vehicle.sold && vehicle.availability?.[type]).slice(0, 3);
  if (!available.length) return null;
  return <section className="section-tint"><div className="shell section-pad"><div className="section-heading"><div><span className="eyebrow">Our current selection</span><h2>{title}</h2></div><a className="text-link" href={`/vehicles/listing/${type}`}>See all vehicles →</a></div><div className="card-grid">{available.map(vehicle => <VehicleCard key={vehicle.id || vehicle.slug} vehicle={vehicle} type={type}/>)}</div></div></section>;
}

function Services({ exclude }) {
  return <section className="shell section-pad"><div className="section-heading"><div><span className="eyebrow">More of what we do</span><h2>Our services</h2></div></div><div className="service-grid">{serviceCards.filter(card => card.path !== exclude).slice(0,4).map(card => <a href={card.path} className="service-card" key={card.path}><img src={`/images/services/${card.image}`} width="400" height="268" alt="" loading="lazy"/><div><h3>{card.title}</h3><p>{card.body}</p><span>Find out more <b aria-hidden="true">↗</b></span></div></a>)}</div></section>;
}

function StandardPage({ path, initial }) {
  const page = pages[path];
  return <><Hero path={path} {...page}/><main><div className="shell content-layout"><div className="article-column"><div className="intro-copy"><span className="eyebrow">Established 1986 · Staffordshire</span><h2>Local people. Practical help.</h2><p>{page.intro}</p></div><div className="feature-stack">{page.features.map(feature => <section className="feature-row" key={feature.title}><img src={`/images/page-content/${feature.image}`} alt={feature.alt} width="800" height="550" loading="lazy"/><div><h2>{feature.title}</h2><p>{feature.text}</p><a className="btn btn-outline" href={feature.href}>{feature.cta} <span aria-hidden="true">↗</span></a></div></section>)}</div><section className="why-section"><span className="eyebrow">Why choose us</span><h2>{page.whyTitle}</h2><ul>{page.why.map(item=><li key={item}>{item}</li>)}</ul></section></div><aside className="sidebar">{path === '/' && <Quote/>}<OpeningHours/></aside></div>{page.featured && <Featured type={page.featured} title={page.featuredHeading} initialVehicles={initial.featured?.[page.featured] || []}/>}<Services exclude={path}/></main></>;
}

function FilterSelect({ label, name, choices, value, onChange }) {
  return <label className="filter-field"><span>{label}</span><select name={name} value={value} onChange={event=>onChange(name,event.target.value)}>{choices.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

function Listing({ initial, type }) {
  const [filters, setFilters] = useState({ sort: 'price-low', size: 'all', seats: 'all', fuel: 'all' });
  const [vehicles, setVehicles] = useState(initial.vehicles || []);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFilters(getFilters()); }, []);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ type, ...filters });
    if (typeof window !== 'undefined' && window.location.search) {
      for (const [key, value] of new URLSearchParams(window.location.search)) if (['sort','size','seats','fuel'].includes(key)) params.set(key, value);
    }
    setLoading(true);
    fetch(`/api/vehicles?${params}`, { signal: controller.signal }).then(response => response.ok ? response.json() : Promise.reject(new Error('Unavailable')))
      .then(data => { if (Array.isArray(data.vehicles)) { setVehicles(data.vehicles); setFailed(false); } })
      .catch(error => { if (error.name !== 'AbortError') setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [type, filters]);
  const update = (name, value) => {
    const next = { ...filters, [name]: value };
    setFilters(next);
    const params = new URLSearchParams(Object.entries(next).filter(([,val]) => val && val !== 'all' && val !== 'price-low'));
    history.replaceState({}, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
  };
  const list = filterVehicles(vehicles, type, filters);
  return <main className="listing-page"><div className="shell"><div className="listing-intro"><span className="eyebrow">Browse the range</span><h1>Vehicles for {typeNames[type]}</h1><p>Find the right car or van in Stoke-on-Trent. Our stock changes regularly; call us if you have something specific in mind.</p></div><div className="listing-toolbar"><strong>{list.length} {list.length === 1 ? 'vehicle' : 'vehicles'}</strong><span aria-live="polite">{loading ? 'Checking current stock…' : failed ? 'Showing the last published catalogue.' : 'Current stock'}</span></div><form className="filters" onSubmit={event => event.preventDefault()}>
    <FilterSelect label="Sort by" name="sort" value={filters.sort} onChange={update} choices={[["price-low","Price: low to high"],["price-high","Price: high to low"]]}/>
    <FilterSelect label="Category" name="size" value={filters.size} onChange={update} choices={categories}/>
    <FilterSelect label="Seats" name="seats" value={filters.seats} onChange={update} choices={[["all","Any"],["2","2 seats"],["3","3 seats"],["4+","4+ seats"]]}/>
    <FilterSelect label="Fuel" name="fuel" value={filters.fuel} onChange={update} choices={[["all","Any"],["petrol","Petrol"],["diesel","Diesel"]]}/>
  </form>{list.length ? <div className="card-grid listing-grid">{list.map(vehicle=><VehicleCard key={vehicle.id || vehicle.slug} vehicle={vehicle} type={type}/>)}</div> : <div className="empty-state"><h2>No vehicles match these filters</h2><p>Try another selection, or contact us about vehicles that have not yet been listed.</p><a className="btn btn-blue" href="/contact">Contact us</a></div>}<div className="listing-end"><p>Can't find what you're looking for? Our stock is always changing.</p><a className="text-link" href="/contact">Talk to our team →</a></div></div></main>;
}

function VehicleDetail({ initial }) {
  const [vehicle, setVehicle] = useState(initial.vehicle);
  const [related, setRelated] = useState(initial.relatedVehicles || []);
  const [selected, setSelected] = useState(0);
  const ref = ['hire','sales','lease'].includes(initial.ref) ? initial.ref : 'hire';
  useEffect(() => {
    if (!initial.vehicle?.slug) return;
    const controller = new AbortController();
    fetch(`/api/vehicles/${encodeURIComponent(initial.vehicle.slug)}?ref=${ref}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null).then(data => {
        if (data?.vehicle) { setVehicle(data.vehicle); setRelated(data.relatedVehicles || []); }
      }).catch(()=>{});
    return () => controller.abort();
  }, [initial.vehicle?.slug, ref]);
  if (!vehicle) return <NotFound/>;
  const details = vehicle.details || {};
  const fields = [['Year', details.year], ['Category', categoryName(vehicle.category)], ['Mileage', details.mileage != null ? `${Number(details.mileage).toLocaleString('en-GB')} miles` : null], ['Engine size', details.engineSize ? `${details.engineSize}L` : null], ['Transmission', details.transmission], ['Fuel economy', details.fuelEconomy ? `${details.fuelEconomy} mpg` : null], ['Fuel type', details.fuelType], ['Seats', details.seats], ['Doors', details.doors]];
  if (vehicle.category?.startsWith('van-')) fields.push(['Vehicle height', details.height ? `${details.height} mm` : null], ['Storage width', details.storage?.width ? `${details.storage.width} mm` : null], ['Storage height', details.storage?.height ? `${details.storage.height} mm` : null], ['Storage length', details.storage?.length ? `${details.storage.length} mm` : null], ['Payload', details.cargo ? `${details.cargo} kg` : null]);
  const shots = safeArray(vehicle.photos);
  const shot = shots[selected] || shots[0];
  const large = typeof shot === 'string' ? `/images/vehicles/${vehicle.id}/${shot}-1000.jpg` : shot?.url1000 || shot?.url || photoUrl(vehicle,'1000');
  return <main className="detail-page"><div className="shell"><a className="back-link" href={`/vehicles/listing/${ref}`}>← Back to vehicles for {typeNames[ref]}</a><div className="detail-heading"><span className="eyebrow">{categoryName(vehicle.category)} · {details.year || ''}</span><h1>{vehicle.name}</h1></div><div className="detail-grid"><section><div className="main-photo"><img src={large} alt={shot?.alt || vehicle.name} width={shot?.width || 1000} height={shot?.height || 667} fetchPriority="high" />{vehicle.sold && <span className="sold-badge">Sold</span>}</div>{shots.length > 1 && <div className="thumbnail-row" aria-label="Vehicle photos">{shots.map((photo,index) => <button key={index} type="button" onClick={() => setSelected(index)} aria-label={`View photo ${index + 1}`} aria-pressed={selected===index}><img src={typeof photo==='string' ? `/images/vehicles/${vehicle.id}/${photo}-400.jpg` : photo.url400 || photo.url} alt="" width="100" height="68" loading="lazy"/></button>)}</div>}{details.description && <section className="description"><h2>About this vehicle</h2><p>{plain(details.description)}</p></section>}</section><aside><section className="detail-price"><span className="eyebrow">Your options</span><div className="price-options">{[['hire','Hire','/day'],['lease','Lease','/month'],['sales','Buy','']].map(([key,label,unit])=><div key={key} className={!vehicle.availability?.[key] ? 'unavailable' : ''}><span>{label}</span>{vehicle.availability?.[key] ? <strong>{money(vehicle.pricing?.[key])}<small>{money(vehicle.pricing?.[key]) !== 'POA' ? unit : ''}</small></strong> : <em>Unavailable</em>}</div>)}</div>{vehicle.sold ? <p className="sold-note">This vehicle has been sold. See our current stock for alternatives.</p> : <><p>Contact us to enquire about this vehicle or check availability.</p><a className="btn btn-green" href={phoneLink}>Call {phone} ↗</a><a className="text-link" href={`/contact?vehicle=${encodeURIComponent(vehicle.name)}`}>Send an enquiry →</a></>}</section><section className="detail-specs"><h2>Details</h2><dl>{fields.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value == null || value === '' ? '—' : value}</dd></div>)}</dl></section></aside></div></div>{related.length > 0 && <section className="section-tint"><div className="shell section-pad"><div className="section-heading"><div><span className="eyebrow">Keep looking</span><h2>Related vehicles</h2></div></div><div className="card-grid">{related.slice(0,3).map(item=><VehicleCard key={item.id || item.slug} vehicle={item} type={ref}/>)}</div></div></section>}</main>;
}

function Contact() {
  const [status,setStatus] = useState('');
  const [sending,setSending] = useState(false);
  const [vehicle,setVehicle] = useState('');
  useEffect(() => { setVehicle(new URLSearchParams(location.search).get('vehicle') || ''); },[]);
  const submit = async event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    if (fields.get('telephone')) { setStatus('Thank you.'); return; }
    setSending(true); setStatus('');
    try {
      const response = await fetch('/api/contact',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:fields.get('name'), phone:fields.get('phone'), email:fields.get('email'), message:fields.get('message'), subject:vehicle ? `Vehicle enquiry: ${vehicle}` : 'Website enquiry'}) });
      if (!response.ok) throw new Error('delivery failed');
      event.currentTarget.reset(); setStatus('Thank you — your enquiry has been sent. We will be in touch.');
    } catch { setStatus(`Your message could not be sent. Please call ${phone} instead.`); }
    finally { setSending(false); }
  };
  return <><Hero path="/contact" heading="Get in touch" eyebrow="We are here to help" lead="Questions about a vehicle, booking or service? Speak to the team in Knypersley."/><main className="shell content-layout contact-layout"><div><span className="eyebrow">Send an enquiry</span><h2>How can we help?</h2><p>Ask us about the latest vehicles and offers, or get more information on our services. You can also call us directly.</p><form onSubmit={submit} className="contact-form"><label>Name<input type="text" name="name" maxLength="50" required autoComplete="name"/></label><div className="form-pair"><label>Phone number<input type="tel" name="phone" maxLength="20" required autoComplete="tel" /></label><label>Email<input type="email" name="email" maxLength="100" required autoComplete="email" /></label></div><label className="honeypot" aria-hidden="true">Telephone<input name="telephone" type="tel" tabIndex="-1" autoComplete="off" /></label><label>Message<textarea name="message" rows="7" required defaultValue={vehicle ? `I'm interested in ${vehicle}.` : ''}/></label><button className="btn btn-blue" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send message'} ↗</button><p className="form-status" role="status">{status}</p><p className="fine-print">We use your details to respond to your enquiry. See our <a href="/privacy">privacy policy</a>.</p></form></div><aside className="contact-aside"><OpeningHours/><section className="side-panel"><span className="eyebrow">Find us</span><h3>Knypersley, Stoke-on-Trent</h3><address>{address.map(line=><React.Fragment key={line}>{line}<br/></React.Fragment>)}</address><p><a href={phoneLink}>{phone}</a><br/><a href="mailto:info@moorlandselfdrive.co.uk">info@moorlandselfdrive.co.uk</a></p><a className="btn btn-outline" href="https://www.google.co.uk/maps/place/Moorland+Self+Drive/@53.0941029,-2.1798971,15z/data=!4m5!3m4!1s0x0:0x1b87236bea61478f!8m2!3d53.0941029!4d-2.1798971" target="_blank" rel="noreferrer">Get directions ↗</a></section></aside></main></>;
}

function Footer() {
  return <footer className="footer"><div className="shell"><div className="footer-main"><div className="footer-intro"><img src="/images/logos/msd-logo-white.svg" width="160" height="79" alt="Moorland Self Drive"/><p>Family-run vehicle hire, sales and servicing in Stoke-on-Trent since 1986.</p></div><div><h2>Services</h2>{serviceCards.map(card=><a key={card.path} href={card.path}>{card.title}</a>)}</div><div><h2>Useful links</h2><a href="/van-sizes">Van size guide</a><a href="/contact">Contact us</a><a href="/terms-and-conditions">Terms & conditions</a><a href="/privacy">Privacy policy</a></div><div><h2>Come and see us</h2><address>{address.map(line=><React.Fragment key={line}>{line}<br/></React.Fragment>)}</address><a href={phoneLink}>{phone}</a><a href="mailto:info@moorlandselfdrive.co.uk">info@moorlandselfdrive.co.uk</a></div></div><div className="footer-legal"><p>Moorland Self Drive and MSD Custom Commercials are trading names of Basesweep Ltd, incorporated in England & Wales (02009551), registered office Unit 1, Childerplay Road, Knypersley, Stoke-on-Trent, ST8 7PZ. Basesweep Limited is a credit broker, not a lender, authorised and regulated by the Financial Conduct Authority (FCA No. 671071). Finance is subject to status. Other offers may be available. We work with selected credit providers who may offer finance for your purchase.</p><span>© {new Date().getUTCFullYear()} Moorland Self Drive</span></div></div></footer>;
}

function Legal({ initial }) { return <main className="shell legal-page"><span className="eyebrow">Moorland Self Drive</span><h1>{initial.path === '/privacy' ? 'Privacy policy' : 'Terms and conditions'}</h1><div className="legal-body" dangerouslySetInnerHTML={{__html:initial.legalHtml || ''}}/></main>; }
function NotFound() { return <main className="shell error-page"><span className="eyebrow">404 · Page not found</span><h1>We cannot find that page.</h1><p>The address might have changed. Browse the vehicles, or speak to our team.</p><div className="error-actions"><a className="btn btn-blue" href="/">Go to home</a><a className="text-link" href="/contact">Contact us →</a></div></main>; }

export function App({ initial = {} }) {
  const path = initial.path || '/';
  const type = /^\/vehicles\/listing\/(hire|sales|lease)$/.exec(path)?.[1];
  let content;
  if (pages[path]) content = <StandardPage path={path} initial={initial}/>;
  else if (type) content = <Listing initial={initial} type={type}/>;
  else if (path.startsWith('/vehicles/') && initial.vehicle) content = <VehicleDetail initial={initial}/>;
  else if (path === '/contact') content = <Contact/>;
  else if (path === '/privacy' || path === '/terms-and-conditions') content = <Legal initial={initial}/>;
  else content = <NotFound/>;
  return <><a href="#main-content" className="skip-link">Skip to content</a><Header path={path}/><div id="main-content">{content}</div><Footer/></>;
}

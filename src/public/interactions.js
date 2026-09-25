// Progressive enhancements for server-rendered public pages. Catalogue and
// filter content is already present in HTML; this bundle never hydrates it.

const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-nav');
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.innerHTML = `Menu <span aria-hidden="true">${open ? '×' : '☰'}</span>`;
  navigation?.classList.toggle('is-open', open);
});

const quote = document.querySelector('[data-quote]');
if (quote) {
  let kind = 'van';
  let period = 0;
  const updatePrice = () => {
    const group = quote.querySelector(`[data-quote-options="${kind}"]`);
    const size = group?.querySelector('[data-quote-size][aria-pressed="true"]');
    quote.querySelector('[data-quote-price]').textContent = `£${period ? size?.dataset.weekly : size?.dataset.daily}`;
    quote.querySelector('[data-quote-unit]').textContent = `/${period ? 'week' : 'day'} inc. VAT`;
  };
  quote.addEventListener('click', event => {
    const choice = event.target.closest('button[data-quote-kind], button[data-quote-size], button[data-quote-period]');
    if (!choice || !quote.contains(choice)) return;
    if (choice.dataset.quoteKind) {
      kind = choice.dataset.quoteKind;
      for (const button of quote.querySelectorAll('[data-quote-kind]')) button.setAttribute('aria-pressed', String(button === choice));
      for (const group of quote.querySelectorAll('[data-quote-options]')) {
        group.hidden = group.dataset.quoteOptions !== kind;
        const first = group.querySelector('[data-quote-size]');
        for (const button of group.querySelectorAll('[data-quote-size]')) button.setAttribute('aria-pressed', String(button === first));
      }
      quote.querySelector('[data-quote-size-label]').textContent = `${kind === 'van' ? 'Van' : 'Car'} size`;
      quote.querySelector('[data-quote-size-guide]').hidden = kind !== 'van';
    } else if (choice.dataset.quoteSize) {
      for (const button of choice.parentElement.querySelectorAll('[data-quote-size]')) button.setAttribute('aria-pressed', String(button === choice));
    } else {
      period = Number(choice.dataset.quotePeriod);
      for (const button of quote.querySelectorAll('[data-quote-period]')) button.setAttribute('aria-pressed', String(button === choice));
    }
    updatePrice();
  });
}

const mainPhoto = document.querySelector('[data-main-photo]');
const thumbnails = document.querySelector('.thumbnail-row');
thumbnails?.addEventListener('click', async event => {
  const link = event.target.closest('a[data-photo-alt]');
  if (!link || !thumbnails.contains(link) || !mainPhoto) return;
  event.preventDefault();
  const next = new Image();
  next.src = link.href;
  try {
    await next.decode();
    mainPhoto.src = next.src;
    mainPhoto.alt = link.dataset.photoAlt;
    for (const thumbnail of thumbnails.querySelectorAll('a')) thumbnail.removeAttribute('aria-current');
    link.setAttribute('aria-current', 'true');
  } catch {
    // Keep the already visible image if the new R2 object cannot be decoded.
  }
});

const contact = document.querySelector('[data-contact-form]');
contact?.addEventListener('submit', async event => {
  event.preventDefault();
  const fields = new FormData(contact);
  const button = contact.querySelector('[type="submit"]');
  const status = contact.querySelector('[role="status"]');
  if (fields.get('website')) { status.textContent = 'Thank you.'; return; }
  button.disabled = true;
  button.textContent = 'Sending…';
  status.textContent = '';
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fields.get('name'), phone: fields.get('phone'), email: fields.get('email'),
        message: fields.get('message'), website: fields.get('website'),
        subject: contact.dataset.vehicle ? `Vehicle enquiry: ${contact.dataset.vehicle}` : 'Website enquiry'
      })
    });
    if (!response.ok) throw new Error('Delivery failed');
    contact.reset();
    status.textContent = 'Thank you — your enquiry has been sent. We will be in touch.';
  } catch {
    status.textContent = 'Your message could not be sent. Please call 01782 517782 instead.';
  } finally {
    button.disabled = false;
    button.textContent = 'Send message ↗';
  }
});

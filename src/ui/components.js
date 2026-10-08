import { CATEGORIES, formatPrice } from '../data/products.js';
import { href } from '../router.js';
import { productImage } from './images.js';

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Ürün kartı: ana sayfa rafında, kategori ızgarasında ve "benzer parfümler"de aynı.
export function productCard(p, { size = 520 } = {}) {
  const cat = CATEGORIES[p.category];
  const soldOut = p.stock <= 0;
  return `
    <li class="pcard">
      <a class="pcard__link" href="${href.product(p.id)}" aria-label="${esc(`${p.name}, ${cat.title}, ${formatPrice(p.price)}`)}">
        <div class="pcard__media">
          <img src="${productImage(p, size)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" />
          ${soldOut ? '<span class="pcard__badge">Tükendi</span>' : ''}
        </div>
        <div class="pcard__body">
          <p class="eyebrow">${esc(cat.short)} · ${esc(p.character)}</p>
          <h3 class="pcard__name">${esc(p.name)}</h3>
          <p class="pcard__text">${esc(p.short)}</p>
          <p class="pcard__price">${formatPrice(p.price)} <span>${p.volume} ml</span></p>
        </div>
      </a>
    </li>`;
}

export function crumbs(items) {
  return `<nav class="crumbs" aria-label="Konum">${items
    .map((it, i) =>
      i === items.length - 1
        ? `<span aria-current="page">${esc(it.label)}</span>`
        : `<a href="${it.href}">${esc(it.label)}</a><span aria-hidden="true">/</span>`,
    )
    .join('')}</nav>`;
}

export function qtyControl({ value = 1, max = 99, label = 'Adet' } = {}) {
  return `
    <div class="qty" data-qty>
      <button type="button" class="qty__btn" data-qty-dec aria-label="Adedi azalt">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" /></svg>
      </button>
      <input class="qty__input" type="number" inputmode="numeric" min="1" max="${max}" value="${value}" aria-label="${esc(label)}" />
      <button type="button" class="qty__btn" data-qty-inc aria-label="Adedi artır">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12" /></svg>
      </button>
    </div>`;
}

// Adet kontrolü: 1..max aralığında tutar; değişince onChange(adet) çağrılır.
export function bindQty(root, { max, onChange }) {
  const input = root.querySelector('input');
  const dec = root.querySelector('[data-qty-dec]');
  const inc = root.querySelector('[data-qty-inc]');
  let limit = max;

  const set = (v, notify = true) => {
    const n = Math.min(Math.max(1, Math.floor(Number(v)) || 1), Math.max(1, limit));
    input.value = n;
    dec.disabled = n <= 1;
    inc.disabled = n >= limit;
    if (notify) onChange?.(n);
    return n;
  };

  dec.addEventListener('click', () => set(Number(input.value) - 1));
  inc.addEventListener('click', () => set(Number(input.value) + 1));
  input.addEventListener('change', () => set(input.value));
  input.addEventListener('keydown', (e) => e.key === 'Enter' && set(input.value));
  set(input.value, false);

  return {
    get value() {
      return Number(input.value);
    },
    set: (v) => set(v, false),
    setMax(m) {
      limit = m;
      input.max = Math.max(1, m);
      return set(input.value, false);
    },
    disable(flag) {
      input.disabled = flag;
      dec.disabled = flag || Number(input.value) <= 1;
      inc.disabled = flag || Number(input.value) >= limit;
    },
  };
}

export const sampleNote = (text = 'Örnek ürün verisi: fiyat, notalar, kalıcılık ve stok bilgileri geçicidir.') =>
  `<p class="sample-note">${esc(text)}</p>`;

export const emblem = (cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#emblem" /></svg>`;

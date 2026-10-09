import { CATEGORIES, formatPrice, hasSampleData } from '../data/products.js';
import { getCart, setQty, removeFromCart, onCartChange } from '../store/cart.js';
import { href } from '../router.js';
import { crumbs, qtyControl, bindQty, sampleNote, emblem, esc } from '../ui/components.js';
import { productImage } from '../ui/images.js';

export function cartPage() {
  const html = `
    <section class="page cartp" aria-labelledby="page-title">
      <div class="container">
        ${crumbs([{ label: 'Ana sayfa', href: href.home }, { label: 'Sepet' }])}
        <h1 class="page-title" id="page-title" tabindex="-1">Sepet.</h1>
        <div data-cart-body></div>
      </div>
    </section>`;

  return {
    title: 'Sepet',
    html,
    mount(root) {
      const body = root.querySelector('[data-cart-body]');
      let shownIds = null;
      const ids = (cart) => cart.lines.map((l) => l.product.id).join(',');

      // Yalnızca adet değiştiyse toplamları yerinde güncelle (odak ve adet kutusu korunur).
      const update = () => {
        const cart = getCart();
        if (ids(cart) !== shownIds) return draw();
        for (const { product, total } of cart.lines) {
          body.querySelector(`[data-line="${product.id}"] .cline__total`).textContent = formatPrice(total);
        }
        body.querySelector('[data-count-label]').textContent = `Ürünler (${cart.count} adet)`;
        body.querySelectorAll('[data-sum]').forEach((el) => (el.textContent = formatPrice(cart.subtotal)));
      };

      const draw = () => {
        const cart = getCart();
        shownIds = ids(cart);
        body.innerHTML = cart.lines.length ? filled(cart) : empty();
        body.querySelectorAll('[data-line]').forEach((li) => {
          const id = li.dataset.line;
          const line = cart.lines.find((l) => l.product.id === id);
          bindQty(li.querySelector('[data-qty]'), { max: line.product.stock, onChange: (n) => setQty(id, n) });
          li.querySelector('[data-remove]').addEventListener('click', () => {
            removeFromCart(id);
            // Odak kaybolmasın: bir sonraki satıra ya da başlığa taşı.
            requestAnimationFrame(() => (body.querySelector('[data-remove]') ?? root.querySelector('#page-title'))?.focus());
          });
        });
      };
      draw();
      return onCartChange(update);
    },
  };
}

function filled(cart) {
  const lines = cart.lines
    .map(({ product: p, qty, total }) => {
      const cat = CATEGORIES[p.category];
      return `
        <li class="cline" data-line="${p.id}">
          <a class="cline__media" href="${href.product(p.id)}" tabindex="-1" aria-hidden="true">
            <img src="${productImage(p, 520)}" alt="" width="120" height="120" />
          </a>
          <div class="cline__info">
            <a class="cline__name" href="${href.product(p.id)}">${esc(p.name)}</a>
            <p class="cline__meta">${esc(cat.title)} · ${p.volume} ml</p>
            <p class="cline__unit">Birim fiyat ${formatPrice(p.price)}</p>
          </div>
          <div class="cline__qty">${qtyControl({ value: qty, max: p.stock, label: `${p.name} adedi` })}</div>
          <p class="cline__total" aria-label="Satır toplamı">${formatPrice(total)}</p>
          <button type="button" class="cline__remove" data-remove aria-label="${esc(p.name)} ürününü sepetten kaldır">Kaldır</button>
        </li>`;
    })
    .join('');

  return `
    <div class="cartp__grid">
      <ul class="cart-lines" aria-label="Sepetteki ürünler">${lines}</ul>
      <aside class="summary" aria-labelledby="summary-title">
        <h2 class="summary__title" id="summary-title">Sipariş özeti</h2>
        <dl>
          <div><dt data-count-label>Ürünler (${cart.count} adet)</dt><dd data-sum>${formatPrice(cart.subtotal)}</dd></div>
          <div><dt>Ara toplam</dt><dd data-sum>${formatPrice(cart.subtotal)}</dd></div>
          <div class="summary__total"><dt>Genel toplam</dt><dd data-sum data-grand-total>${formatPrice(cart.subtotal)}</dd></div>
        </dl>
        <button type="button" class="btn btn--primary btn--block" disabled aria-describedby="checkout-note">Ödemeye geç</button>
        <p class="summary__note" id="checkout-note">Online ödeme henüz aktif değil. Kargo ücreti ödeme adımında belirlenecek; sepetiniz bu cihazda saklanır.</p>
        <a class="summary__back" href="#koleksiyon">Alışverişe devam et</a>
        ${hasSampleData(cart.lines.map((l) => l.product)) ? sampleNote('Fiyatlar örnektir.') : ''}
      </aside>
    </div>`;
}

function empty() {
  return `
    <div class="empty">
      ${emblem('empty__emblem')}
      <h2 class="empty__title">Sepetiniz boş.</h2>
      <p class="empty__text">Bir yankı seçin; burada sizi bekliyor olsun.</p>
      <div class="empty__actions">
        <a class="btn btn--primary" href="${href.category('kadin')}">Kadın Parfümleri</a>
        <a class="btn btn--ghost" href="${href.category('erkek')}">Erkek Parfümleri</a>
      </div>
    </div>`;
}

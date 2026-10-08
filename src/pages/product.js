import { CATEGORIES, byCategory, formatPrice, SAMPLE_DATA } from '../data/products.js';
import { addToCart, remainingStock, qtyInCart, onCartChange } from '../store/cart.js';
import { href } from '../router.js';
import { productCard, crumbs, qtyControl, bindQty, sampleNote, esc } from '../ui/components.js';
import { productImage } from '../ui/images.js';
import { showToast } from '../ui/toast.js';

// has3D: ürünün kendi 3D modeli var ve WebGL çalışıyor → görsel alanı 3D sahneye bağlanır.
export function productPage(product, { has3D }) {
  const p = product;
  const cat = CATEGORIES[p.category];
  const related = byCategory(p.category).filter((r) => r.id !== p.id);
  const live3D = has3D && !p.visual.placeholder;

  const media = live3D
    ? `<div class="pdp__media pdp__media--3d" data-anchor data-drag-rotate role="img" aria-label="${esc(p.name)} şişesinin döndürülebilir 3D modeli">
         <p class="pdp__hint" aria-hidden="true">Çevirmek için sürükleyin</p>
       </div>`
    : `<figure class="pdp__media">
         <img src="${productImage(p, 900)}" alt="${esc(p.name)} şişesi" width="900" height="900" />
         ${p.visual.placeholder ? '<figcaption>Geçici ürün görseli</figcaption>' : '<figcaption>3D model bu cihazda görüntülenemiyor</figcaption>'}
       </figure>`;

  const noteCol = (label, list) => `
    <div class="notes__col">
      <h3>${label}</h3>
      <ul>${list.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    </div>`;

  const html = `
    <article class="page pdp" aria-labelledby="page-title">
      <div class="container">
        ${crumbs([{ label: 'Ana sayfa', href: href.home }, { label: cat.title, href: href.category(cat.id) }, { label: p.name }])}
        <div class="pdp__grid">
          ${media}
          <div class="pdp__info">
            <p class="eyebrow">${esc(cat.title.replace('Parfümleri', 'Parfümü'))} · ${esc(p.concentration)}</p>
            <h1 class="pdp__name" id="page-title" tabindex="-1">${esc(p.name)}</h1>
            <p class="pdp__short">${esc(p.short)}</p>
            <p class="pdp__price">${formatPrice(p.price)} <span>· ${p.volume} ml</span></p>

            <div class="buy" data-buy>
              <div class="buy__row">
                ${qtyControl({ max: Math.max(1, remainingStock(p.id)), label: `${p.name} adedi` })}
                <p class="buy__sub">Ara toplam <strong data-subtotal>${formatPrice(p.price)}</strong></p>
              </div>
              <button type="button" class="btn btn--primary btn--block" data-add>Sepete Ekle</button>
              <p class="buy__stock" data-stock></p>
            </div>

            <p class="pdp__desc">${esc(p.description)}</p>

            <dl class="specs">
              <div><dt>Koku karakteri</dt><dd>${esc(p.character)}</dd></div>
              <div><dt>Kalıcılık</dt><dd>${esc(p.longevity)}</dd></div>
              <div><dt>Hacim</dt><dd>${p.volume} ml · ${esc(p.concentration)}</dd></div>
              <div><dt>Kullanım</dt><dd>${esc(p.usage)}</dd></div>
            </dl>

            <section class="notes" aria-labelledby="notes-title">
              <h2 class="notes__title" id="notes-title">Koku notaları</h2>
              <div class="notes__grid">
                ${noteCol('Üst notalar', p.notes.top)}
                ${noteCol('Kalp notaları', p.notes.heart)}
                ${noteCol('Dip notaları', p.notes.base)}
              </div>
            </section>
            ${SAMPLE_DATA ? sampleNote() : ''}
          </div>
        </div>

        ${
          related.length
            ? `<section class="related" aria-labelledby="related-title">
                 <h2 class="headline" id="related-title"><strong>${esc(cat.title)}.</strong> Diğerlerine de göz atın.</h2>
                 <ul class="pgrid pgrid--compact">${related.map((r) => productCard(r)).join('')}</ul>
               </section>`
            : ''
        }
      </div>
    </article>`;

  return {
    title: p.name,
    html,
    visual: live3D ? p.visual : null,
    mount(root) {
      const buy = root.querySelector('[data-buy]');
      const addBtn = buy.querySelector('[data-add]');
      const stockEl = buy.querySelector('[data-stock]');
      const subtotalEl = buy.querySelector('[data-subtotal]');

      const qty = bindQty(buy.querySelector('[data-qty]'), {
        max: Math.max(1, remainingStock(p.id)),
        onChange: (n) => (subtotalEl.textContent = formatPrice(p.price * n)),
      });

      const sync = () => {
        const room = remainingStock(p.id);
        const inCart = qtyInCart(p.id);
        const n = qty.setMax(Math.max(1, room));
        subtotalEl.textContent = formatPrice(p.price * n);
        const empty = room <= 0;
        qty.disable(empty);
        addBtn.disabled = empty;
        if (p.stock <= 0) {
          addBtn.textContent = 'Tükendi';
          stockEl.textContent = 'Bu ürün şu anda stokta yok.';
        } else if (empty) {
          addBtn.textContent = 'Stoktaki tüm ürünler sepetinizde';
          stockEl.innerHTML = `Sepetinizde ${inCart} adet var. <a href="${href.cart}">Sepete git</a>`;
        } else {
          addBtn.textContent = 'Sepete Ekle';
          stockEl.innerHTML =
            (p.stock <= 5 ? `Son ${room} adet` : `Stokta ${room} adet`) +
            (inCart ? ` · Sepetinizde ${inCart} adet var` : '');
        }
      };

      addBtn.addEventListener('click', () => {
        const wanted = qty.value;
        const added = addToCart(p.id, wanted);
        if (!added) return;
        const capped = added < wanted ? ' (stok sınırı nedeniyle)' : '';
        showToast(
          `<span><strong>${esc(p.name)}</strong> sepete eklendi — ${added} adet${capped}.</span>
           <a class="toast__link" href="${href.cart}">Sepete git</a>`,
        );
        qty.set(1);
      });

      sync();
      return onCartChange(sync); // sayfadan çıkınca dinleyici kaldırılır
    },
  };
}

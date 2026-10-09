import { CATEGORIES, byCategory, hasSampleData } from '../data/products.js';
import { href } from '../router.js';
import { productCard, crumbs, sampleNote, esc } from '../ui/components.js';

const SORTS = {
  featured: { label: 'Önerilen', fn: () => 0 },
  asc: { label: 'Fiyat: Düşükten yükseğe', fn: (a, b) => a.price - b.price },
  desc: { label: 'Fiyat: Yüksekten düşüğe', fn: (a, b) => b.price - a.price },
};

export function categoryPage({ id }) {
  const cat = CATEGORIES[id];
  const other = CATEGORIES[id === 'kadin' ? 'erkek' : 'kadin'];
  const products = byCategory(id);

  const html = `
    <section class="page cat" aria-labelledby="page-title">
      <header class="page-head container">
        ${crumbs([{ label: 'Ana sayfa', href: href.home }, { label: cat.title }])}
        <div class="page-head__row">
          <h1 class="page-title" id="page-title" tabindex="-1">${esc(cat.title)}.</h1>
          <p class="page-lede">${esc(cat.intro)}</p>
        </div>
        <nav class="segmented" aria-label="Kategoriler">
          ${Object.values(CATEGORIES)
            .map((c) => `<a href="${href.category(c.id)}" ${c.id === id ? 'aria-current="page"' : ''}>${esc(c.title)}</a>`)
            .join('')}
        </nav>
      </header>

      <div class="container">
        <div class="toolbar">
          <p class="toolbar__count">${products.length} parfüm</p>
          <label class="select">
            <span>Sırala</span>
            <select data-sort>
              ${Object.entries(SORTS)
                .map(([k, s]) => `<option value="${k}">${esc(s.label)}</option>`)
                .join('')}
            </select>
          </label>
        </div>
        <ul class="pgrid" data-grid></ul>
        ${hasSampleData(products) ? sampleNote('Ürün bilgileri ve fiyatlar örnektir.') : ''}
        <a class="cat__other" href="${href.category(other.id)}">${esc(other.title)} <span aria-hidden="true">→</span></a>
      </div>
    </section>`;

  return {
    title: cat.title,
    html,
    mount(root) {
      const grid = root.querySelector('[data-grid]');
      const select = root.querySelector('[data-sort]');
      const draw = () => {
        const sorted = [...products].sort(SORTS[select.value].fn);
        grid.innerHTML = sorted.map((p) => productCard(p)).join('');
      };
      select.addEventListener('change', draw);
      draw();
    },
  };
}

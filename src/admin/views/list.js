import { rowToProduct } from '../../data/mapping.js';
import { silhouette } from '../../ui/images.js';
import { esc, tl, STATUS, relTime } from '../ui.js';

const LOW_STOCK = 5;
const FILTER_KEY = 'echoes-admin-filters';

const SORTS = {
  order: { label: 'Sitedeki sıra', fn: (a, b) => a.sort_order - b.sort_order },
  updated: { label: 'Son güncellenen', fn: (a, b) => String(b.updated_at).localeCompare(String(a.updated_at)) },
  name: { label: 'Ada göre', fn: (a, b) => a.name.localeCompare(b.name, 'tr') },
  priceAsc: { label: 'Fiyat: artan', fn: (a, b) => a.price_kurus - b.price_kurus },
  priceDesc: { label: 'Fiyat: azalan', fn: (a, b) => b.price_kurus - a.price_kurus },
  stock: { label: 'Stok: azdan çoğa', fn: (a, b) => a.stock - b.stock },
};

export async function renderList(el, { api }) {
  el.innerHTML = '<p class="boot">Ürünler yükleniyor…</p>';
  const [products, categories] = await Promise.all([api.listProducts(), api.listCategories()]);
  const catTitle = Object.fromEntries(categories.map((c) => [c.id, c.title]));

  let f = { q: '', cat: '', status: 'active', sort: 'order' };
  try {
    f = { ...f, ...JSON.parse(sessionStorage.getItem(FILTER_KEY) || '{}') };
  } catch {
    // varsayılan filtreler
  }

  el.innerHTML = `
    <section class="page wrap" aria-labelledby="page-title">
      <div class="page-head">
        <h1 class="page-title" id="page-title" tabindex="-1">Ürünler.</h1>
        <a class="btn btn--primary" href="#/yeni">+ Yeni ürün</a>
      </div>
      <div class="stats" data-stats></div>
      <div class="filters" role="search">
        <label class="search"><span class="sr-only">Ara</span>
          <input class="input" type="search" data-q placeholder="Ad, adres veya nota ara…" value="${esc(f.q)}" />
        </label>
        <label><span class="sr-only">Kategori</span>
          <select class="select" data-cat>
            <option value="">Tüm kategoriler</option>
            ${categories.map((c) => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join('')}
          </select>
        </label>
        <label><span class="sr-only">Durum</span>
          <select class="select" data-status>
            <option value="active">Yayında + taslak</option>
            <option value="published">Yayında</option>
            <option value="draft">Taslak</option>
            <option value="archived">Arşivde</option>
            <option value="">Tümü</option>
          </select>
        </label>
        <label><span class="sr-only">Sıralama</span>
          <select class="select" data-sort>
            ${Object.entries(SORTS).map(([k, s]) => `<option value="${k}">${esc(s.label)}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">Ürün</th>
              <th scope="col">Kategori</th>
              <th scope="col" class="num">Fiyat</th>
              <th scope="col" class="num">Stok</th>
              <th scope="col">Durum</th>
              <th scope="col">Güncelleme</th>
            </tr>
          </thead>
          <tbody data-rows></tbody>
        </table>
        <p class="empty-state" data-empty hidden>Filtrelere uyan ürün yok.</p>
      </div>
    </section>`;

  const $ = (s) => el.querySelector(s);
  $('[data-cat]').value = f.cat;
  $('[data-status]').value = f.status;
  $('[data-sort]').value = f.sort;

  const thumb = (row) => (row.image_path ? api.imageUrl(row.image_path) : silhouette(rowToProduct(row)));

  const draw = () => {
    sessionStorage.setItem(FILTER_KEY, JSON.stringify(f));
    const q = f.q.trim().toLocaleLowerCase('tr');
    const rows = products
      .filter((p) => !f.cat || p.category_id === f.cat)
      .filter((p) => (f.status === 'active' ? p.status !== 'archived' : !f.status || p.status === f.status))
      .filter(
        (p) =>
          !q ||
          [p.name, p.slug, p.character, ...p.notes_top, ...p.notes_heart, ...p.notes_base].some((s) =>
            String(s).toLocaleLowerCase('tr').includes(q),
          ),
      )
      .sort(SORTS[f.sort].fn);

    $('[data-rows]').innerHTML = rows
      .map((p) => {
        const stockCls = p.stock === 0 ? 'stock--out' : p.stock <= LOW_STOCK ? 'stock--low' : '';
        const stockText = p.stock === 0 ? 'Tükendi' : p.stock <= LOW_STOCK ? `${p.stock} (az)` : p.stock;
        return `
          <tr data-id="${esc(p.id)}">
            <td>
              <div class="prod">
                <img src="${esc(thumb(p))}" alt="" width="44" height="44" loading="lazy" />
                <div>
                  <a href="#/urun/${esc(p.id)}">${esc(p.name)}</a>
                  <small>${esc(p.slug)}${p.is_sample ? ' · <span class="badge badge--sample">Örnek veri</span>' : ''}</small>
                </div>
              </div>
            </td>
            <td data-label="Kategori">${esc(catTitle[p.category_id] ?? p.category_id)}</td>
            <td class="num" data-label="Fiyat">${tl(p.price_kurus)}</td>
            <td class="num ${stockCls}" data-label="Stok">${stockText}</td>
            <td><span class="badge badge--${p.status}">${STATUS[p.status]}</span></td>
            <td data-label="Güncelleme"><time datetime="${esc(p.updated_at)}">${relTime(p.updated_at)}</time></td>
          </tr>`;
      })
      .join('');
    $('[data-empty]').hidden = rows.length > 0;

    const count = (fn) => products.filter(fn).length;
    $('[data-stats]').innerHTML = [
      ['Toplam', products.length],
      ['Yayında', count((p) => p.status === 'published')],
      ['Taslak', count((p) => p.status === 'draft')],
      ['Stokta az', count((p) => p.status !== 'archived' && p.stock > 0 && p.stock <= LOW_STOCK)],
      ['Tükenen', count((p) => p.status !== 'archived' && p.stock === 0)],
    ]
      .map(([label, n]) => `<span class="stat">${label}: <strong>${n}</strong></span>`)
      .join('');
  };

  $('[data-q]').addEventListener('input', (e) => {
    f.q = e.target.value;
    draw();
  });
  for (const [sel, key] of [['[data-cat]', 'cat'], ['[data-status]', 'status'], ['[data-sort]', 'sort']]) {
    $(sel).addEventListener('change', (e) => {
      f[key] = e.target.value;
      draw();
    });
  }
  // Satırın herhangi bir yerine tıklamak ürünü açar (bağlantı klavye için de var).
  $('[data-rows]').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (tr && !e.target.closest('a')) location.hash = `#/urun/${tr.dataset.id}`;
  });

  draw();
}

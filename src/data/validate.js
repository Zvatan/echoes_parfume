// Ürün kaydı doğrulaması. Kurallar veritabanındaki kısıtlarla (0001_catalog.sql) aynıdır;
// panel hatayı kaydetmeden önce, alanın yanında Türkçe olarak gösterir.

export const LIMITS = {
  name: 80,
  slug: 80,
  concentration: 40,
  short_description: 160,
  description: 2000,
  character: 60,
  longevity: 60,
  usage: 200,
  notes: 8,
  note: 40,
  priceMax: 100000000,
  volumeMax: 1000,
  stockMax: 100000,
};

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;
const isInt = (v) => Number.isInteger(v);

// row: DB satırı biçiminde ürün. categories: geçerli kategori id'leri.
// Dönüş: { alanAdı: 'Türkçe hata mesajı' } — boşsa geçerli.
export function validateProduct(row, { categories = [], slugTaken = () => false } = {}) {
  const e = {};
  const len = (v) => String(v ?? '').length;

  if (!String(row.name ?? '').trim()) e.name = 'Ürün adı gerekli.';
  else if (len(row.name) > LIMITS.name) e.name = `En fazla ${LIMITS.name} karakter.`;

  if (!row.slug) e.slug = 'Adres gerekli.';
  else if (!SLUG_RE.test(row.slug)) e.slug = 'Yalnızca küçük harf, rakam ve tire kullanılabilir (ör. echo-no-01).';
  else if (len(row.slug) > LIMITS.slug) e.slug = `En fazla ${LIMITS.slug} karakter.`;
  else if (slugTaken(row.slug)) e.slug = 'Bu adres başka bir üründe kullanılıyor.';

  if (!categories.includes(row.category_id)) e.category_id = 'Kategori seçin.';

  if (row.price_kurus == null || !isInt(row.price_kurus)) e.price_kurus = 'Geçerli bir fiyat girin (ör. 2.850 veya 2.850,50).';
  else if (row.price_kurus < 0) e.price_kurus = 'Fiyat negatif olamaz.';
  else if (row.price_kurus > LIMITS.priceMax) e.price_kurus = 'Fiyat çok yüksek.';

  if (!isInt(row.volume_ml) || row.volume_ml < 1 || row.volume_ml > LIMITS.volumeMax) e.volume_ml = `1 ile ${LIMITS.volumeMax} ml arasında bir tam sayı girin.`;
  if (!isInt(row.stock) || row.stock < 0 || row.stock > LIMITS.stockMax) e.stock = 'Stok 0 veya daha büyük bir tam sayı olmalı.';

  for (const f of ['concentration', 'short_description', 'description', 'character', 'longevity', 'usage']) {
    if (len(row[f]) > LIMITS[f]) e[f] = `En fazla ${LIMITS[f]} karakter.`;
  }

  for (const f of ['notes_top', 'notes_heart', 'notes_base']) {
    const list = row[f] ?? [];
    if (list.length > LIMITS.notes) e[f] = `En fazla ${LIMITS.notes} nota.`;
    else if (list.some((n) => !String(n).trim() || len(n) > LIMITS.note)) e[f] = `Her nota 1–${LIMITS.note} karakter olmalı.`;
  }

  const v = row.visual ?? {};
  if (v.model != null && !['amber', 'clear'].includes(v.model)) e.visual = 'Geçersiz şişe modeli.';
  for (const c of ['glass', 'liquid']) if (v[c] && !HEX_RE.test(v[c])) e.visual = 'Renkler #rrggbb biçiminde olmalı.';

  // Yayındaki ürün sitede eksik görünmesin.
  if (row.status === 'published') {
    if (!String(row.short_description ?? '').trim()) e.short_description ??= 'Yayınlamak için kısa açıklama gerekli.';
    if (!row.image_path && !v.model) e.visual ??= 'Yayınlamak için fotoğraf yükleyin veya bir 3D şişe seçin.';
  }
  return e;
}

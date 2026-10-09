// Veritabanı satırı (supabase/migrations/0001_catalog.sql) ile sitenin kullandığı ürün
// nesnesi arasındaki dönüşümler ve Türkçe biçim yardımcıları.

// DB satırı → site ürünü (src/data/products.js ile aynı biçim)
export function rowToProduct(row, imageUrl = (path) => path) {
  const visual = row.visual && typeof row.visual === 'object' ? row.visual : {};
  return {
    id: row.slug,
    name: row.name,
    category: row.category_id,
    price: row.price_kurus / 100,
    volume: row.volume_ml,
    concentration: row.concentration,
    short: row.short_description,
    description: row.description,
    notes: { top: row.notes_top ?? [], heart: row.notes_heart ?? [], base: row.notes_base ?? [] },
    character: row.character,
    longevity: row.longevity,
    usage: row.usage,
    stock: row.stock,
    visual: {
      model: visual.model ?? null, // null: 3D şişe yok (yalnızca fotoğraf)
      glass: visual.glass || undefined,
      liquid: visual.liquid || undefined,
      // Fotoğraf yüklenmişse geçici görsel sayılmaz.
      placeholder: row.image_path ? false : visual.placeholder !== false,
    },
    image: row.image_path ? imageUrl(row.image_path) : null,
    sample: row.is_sample !== false,
    status: row.status,
  };
}

export const rowToCategory = (row) => ({ id: row.id, title: row.title, short: row.short_title, intro: row.intro });

// Site ürünü (örnek katalog) → DB satırı (demo deposu ve seed için)
export function productToRow(p, i = 0) {
  return {
    slug: p.id,
    name: p.name,
    category_id: p.category,
    status: p.status ?? 'published',
    price_kurus: Math.round(p.price * 100),
    currency: 'TRY',
    volume_ml: p.volume,
    concentration: p.concentration,
    short_description: p.short,
    description: p.description,
    notes_top: [...p.notes.top],
    notes_heart: [...p.notes.heart],
    notes_base: [...p.notes.base],
    character: p.character,
    longevity: p.longevity,
    usage: p.usage,
    stock: p.stock,
    visual: { ...p.visual },
    image_path: null,
    is_sample: true,
    sort_order: i,
  };
}

// "2.850" → 285000, "2.850,50" → 285050, "2850.5" → 285050. Geçersizse null.
export function parsePriceToKurus(input) {
  let s = String(input ?? '').trim().replace(/\s|₺|TL/gi, '');
  if (!s) return null;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.'); // Türkçe: nokta binlik, virgül ondalık
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ''); // 2.850 → 2850
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

// 285000 → "2.850", 285050 → "2.850,50"
export function formatKurus(kurus) {
  const tl = kurus / 100;
  return tl.toLocaleString('tr-TR', { minimumFractionDigits: kurus % 100 ? 2 : 0, maximumFractionDigits: 2 });
}

// "Echo No. 01" → "echo-no-01", "Güneş Çiçeği" → "gunes-cicegi"
export function slugify(text) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', i̇: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return String(text ?? '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .toLowerCase()
    .replace(/[çğıöşüâîû]/g, (c) => map[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

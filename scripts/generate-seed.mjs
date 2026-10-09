// src/data/products.js içindeki örnek kataloğu supabase/seed.sql'e dönüştürür.
// Kullanım: npm run seed
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SAMPLE_CATEGORIES as CATEGORIES, SAMPLE_PRODUCTS as PRODUCTS } from '../src/data/products.js';

const out = fileURLToPath(new URL('../supabase/seed.sql', import.meta.url));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (list) => `array[${list.map(q).join(', ')}]::text[]`;

const lines = [
  '-- ECHOES — başlangıç verisi (scripts/generate-seed.mjs ile üretildi; elle düzenlemeyin)',
  '-- Tüm ürünler ÖRNEK veridir (is_sample = true). Tekrar çalıştırmak mevcut kayıtları günceller.',
  '',
];

Object.values(CATEGORIES).forEach((c, i) => {
  lines.push(
    `insert into public.categories (id, title, short_title, intro, sort_order) values (${q(c.id)}, ${q(c.title)}, ${q(c.short)}, ${q(c.intro)}, ${i})`,
    `  on conflict (id) do update set title = excluded.title, short_title = excluded.short_title, intro = excluded.intro, sort_order = excluded.sort_order;`,
  );
});
lines.push('');

PRODUCTS.forEach((p, i) => {
  const visual = JSON.stringify(p.visual);
  lines.push(
    `insert into public.products (slug, name, category_id, status, price_kurus, volume_ml, concentration, short_description, description,`,
    `  notes_top, notes_heart, notes_base, character, longevity, usage, stock, visual, is_sample, sort_order)`,
    `values (${q(p.id)}, ${q(p.name)}, ${q(p.category)}, 'published', ${Math.round(p.price * 100)}, ${p.volume}, ${q(p.concentration)}, ${q(p.short)}, ${q(p.description)},`,
    `  ${arr(p.notes.top)}, ${arr(p.notes.heart)}, ${arr(p.notes.base)}, ${q(p.character)}, ${q(p.longevity)}, ${q(p.usage)}, ${p.stock}, ${q(visual)}::jsonb, true, ${i})`,
    `on conflict (slug) do update set name = excluded.name, category_id = excluded.category_id, price_kurus = excluded.price_kurus,`,
    `  volume_ml = excluded.volume_ml, concentration = excluded.concentration, short_description = excluded.short_description,`,
    `  description = excluded.description, notes_top = excluded.notes_top, notes_heart = excluded.notes_heart, notes_base = excluded.notes_base,`,
    `  character = excluded.character, longevity = excluded.longevity, usage = excluded.usage, stock = excluded.stock,`,
    `  visual = excluded.visual, sort_order = excluded.sort_order;`,
    '',
  );
});

writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`seed.sql yazıldı: ${Object.keys(CATEGORIES).length} kategori, ${PRODUCTS.length} ürün`);

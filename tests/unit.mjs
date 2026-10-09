const root = new URL('../src/', import.meta.url).href;
const { parsePriceToKurus, formatKurus, slugify, rowToProduct, productToRow } = await import(root + 'data/mapping.js');
const { validateProduct } = await import(root + 'data/validate.js');
const { PRODUCTS } = await import(root + 'data/products.js');

let fail = 0;
const eq = (l, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) fail++; console.log(`${ok ? '✓' : '✗'} ${l}${ok ? '' : `  beklenen=${JSON.stringify(b)} gelen=${JSON.stringify(a)}`}`); };

// Fiyat ayrıştırma (Türkçe biçim)
eq('"2.850" → 285000', parsePriceToKurus('2.850'), 285000);
eq('"2850" → 285000', parsePriceToKurus('2850'), 285000);
eq('"2.850,50" → 285050', parsePriceToKurus('2.850,50'), 285050);
eq('"2850,5" → 285050', parsePriceToKurus('2850,5'), 285050);
eq('"2850.5" → 285050', parsePriceToKurus('2850.5'), 285050);
eq('"₺ 1.250.000" → 125000000', parsePriceToKurus('₺ 1.250.000'), 125000000);
eq('"12,345" (3 ondalık) geçersiz', parsePriceToKurus('12,345'), null);
eq('"abc" geçersiz', parsePriceToKurus('abc'), null);
eq('boş geçersiz', parsePriceToKurus(''), null);
eq('"-5" geçersiz', parsePriceToKurus('-5'), null);
eq('biçimleme 285000 → "2.850"', formatKurus(285000), '2.850');
eq('biçimleme 285050 → "2.850,50"', formatKurus(285050), '2.850,50');

// Adres üretimi
eq('slug: Echo No. 01', slugify('Echo No. 01'), 'echo-no-01');
eq('slug: Türkçe karakterler', slugify('Güneş Çiçeği Işıltı İz'), 'gunes-cicegi-isilti-iz');
eq('slug: boşluk/simge temizliği', slugify('  --Gece   & Gündüz!! '), 'gece-gunduz');

// Gidiş-dönüş: örnek ürün → satır → ürün
const p = PRODUCTS[0];
const back = rowToProduct({ ...productToRow(p), id: 'uuid' });
eq('gidiş-dönüş: fiyat, notalar, model aynı', [back.id, back.price, back.notes, back.visual.model], [p.id, p.price, p.notes, p.visual.model]);
eq('fotoğraflı ürün geçici görsel sayılmaz', rowToProduct({ ...productToRow(PRODUCTS[1]), image_path: 'x.webp' }, (x) => 'https://cdn/' + x).visual.placeholder, false);
eq('fotoğraf URL\'si üretilir', rowToProduct({ ...productToRow(PRODUCTS[1]), image_path: 'x.webp' }, (x) => 'https://cdn/' + x).image, 'https://cdn/x.webp');

// Doğrulama
const cats = ['kadin', 'erkek'];
const ok = productToRow(p);
eq('örnek ürün geçerli', validateProduct(ok, { categories: cats }), {});
eq('boş ad', Object.keys(validateProduct({ ...ok, name: '  ' }, { categories: cats })), ['name']);
eq('geçersiz adres', Object.keys(validateProduct({ ...ok, slug: 'Echo No 1' }, { categories: cats })), ['slug']);
eq('alınmış adres', validateProduct(ok, { categories: cats, slugTaken: () => true }).slug, 'Bu adres başka bir üründe kullanılıyor.');
eq('negatif fiyat', Object.keys(validateProduct({ ...ok, price_kurus: -1 }, { categories: cats })), ['price_kurus']);
eq('fiyat girilmemiş', Object.keys(validateProduct({ ...ok, price_kurus: null }, { categories: cats })), ['price_kurus']);
eq('ondalıklı stok', Object.keys(validateProduct({ ...ok, stock: 1.5 }, { categories: cats })), ['stock']);
eq('olmayan kategori', Object.keys(validateProduct({ ...ok, category_id: 'unisex' }, { categories: cats })), ['category_id']);
eq('9 nota fazla', Object.keys(validateProduct({ ...ok, notes_top: Array(9).fill('a') }, { categories: cats })), ['notes_top']);
eq('kısa açıklama 161 karakter', Object.keys(validateProduct({ ...ok, short_description: 'x'.repeat(161) }, { categories: cats })), ['short_description']);
eq('yayında + kısa açıklama boş', Object.keys(validateProduct({ ...ok, short_description: '' }, { categories: cats })), ['short_description']);
eq('taslak + kısa açıklama boş → geçerli', validateProduct({ ...ok, status: 'draft', short_description: '' }, { categories: cats }), {});
eq('yayında + görsel yok', Object.keys(validateProduct({ ...ok, visual: { model: null } }, { categories: cats })), ['visual']);
eq('geçersiz renk', Object.keys(validateProduct({ ...ok, visual: { model: 'amber', liquid: 'kırmızı' } }, { categories: cats })), ['visual']);

console.log(fail ? `\n${fail} BİRİM TESTİ BAŞARISIZ` : '\nTüm birim testleri geçti');
process.exit(fail ? 1 : 0);

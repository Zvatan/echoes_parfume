// localStorage / window taklidi
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)) };
globalThis.window = { addEventListener() {} };
const root = new URL('../src/', import.meta.url).href;
const { PRODUCTS, CATEGORIES, formatPrice, byId } = await import(root + 'data/products.js');
let cart = await import(root + 'store/cart.js?a');

let fail = 0;
const eq = (label, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : `  beklenen=${JSON.stringify(b)} gelen=${JSON.stringify(a)}`}`);
};

// Katalog
eq('kadın ürün sayısı ≥ 4', PRODUCTS.filter((p) => p.category === 'kadin').length >= 4, true);
eq('erkek ürün sayısı ≥ 4', PRODUCTS.filter((p) => p.category === 'erkek').length >= 4, true);
eq('id\'ler benzersiz', new Set(PRODUCTS.map((p) => p.id)).size, PRODUCTS.length);
eq('eski model (amber) kadın ürününde', PRODUCTS.filter((p) => p.visual.model === 'amber' && !p.visual.placeholder).map((p) => p.category), ['kadin']);
eq('yeni model (clear) erkek ürününde', PRODUCTS.filter((p) => p.visual.model === 'clear' && !p.visual.placeholder).map((p) => p.category), ['erkek']);
eq('tüm kategoriler tanımlı', PRODUCTS.every((p) => CATEGORIES[p.category]), true);
eq('notlar eksiksiz', PRODUCTS.every((p) => p.notes.top.length && p.notes.heart.length && p.notes.base.length), true);
eq('fiyat biçimi', formatPrice(2850).replace(/\s/g, ' '), '₺2.850');

// Sepet
eq('başlangıçta boş', cart.getCart().count, 0);
eq('Echo No. 01 x2 eklendi', cart.addToCart('echo-no-01', 2), 2);
eq('aynı ürün tekrar → satır birleşir', (cart.addToCart('echo-no-01', 1), cart.getCart().lines.length), 1);
eq('adet 3', cart.qtyInCart('echo-no-01'), 3);
eq('Afterglow x1', cart.addToCart('afterglow', 1), 1);
eq('toplam adet 4', cart.getCart().count, 4);
eq('ara toplam = 3×2850 + 2950', cart.getCart().subtotal, 3 * 2850 + 2950);
// Night Archive stok 3
eq('stok sınırı: 5 istenir, 3 eklenir', cart.addToCart('night-archive', 5), 3);
eq('stok dolu: 1 daha → 0', cart.addToCart('night-archive', 1), 0);
eq('kalan stok 0', cart.remainingStock('night-archive'), 0);
cart.setQty('night-archive', 99);
eq('setQty stoka kırpılır', cart.qtyInCart('night-archive'), 3);
cart.setQty('night-archive', 0);
eq('setQty en az 1', cart.qtyInCart('night-archive'), 1);
cart.removeFromCart('night-archive');
eq('silme', cart.qtyInCart('night-archive'), 0);
eq('bilinmeyen ürün eklenemez', cart.addToCart('yok-boyle-urun', 1), 0);

// "Sayfa yenileme": modülü sıfırdan yükle, aynı localStorage
const before = cart.getCart();
cart = await import(root + 'store/cart.js?b');
eq('yenileme sonrası sepet korunur', cart.getCart().lines.map((l) => [l.product.id, l.qty]), before.lines.map((l) => [l.product.id, l.qty]));

// Bozuk / eski kayıt
store['echoes-cart-v1'] = JSON.stringify([{ id: 'velvet-trace', qty: 50 }, { id: 'silinmis', qty: 1 }, { id: 'velvet-trace', qty: 1 }, 'çöp']);
cart = await import(root + 'store/cart.js?c');
eq('bozuk kayıt temizlenir ve stoka kırpılır', cart.getCart().lines.map((l) => [l.product.id, l.qty]), [['velvet-trace', byId('velvet-trace').stock]]);

console.log(fail ? `\n${fail} TEST BAŞARISIZ` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);

import { chromium } from 'playwright';

const URL = process.env.URL;
const SHOTS = process.env.SHOTS || 'e2e';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

let fail = 0;
const check = (label, ok, extra = '') => {
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} ${label}${!ok && extra ? `  → ${extra}` : ''}`);
};
const num = (s) => Number(String(s).replace(/[^\d,]/g, '').replace(',', '.'));
const text = (sel) => page.locator(sel).first().innerText();
const settle = (ms = 900) => page.waitForTimeout(ms);
const ready = () => page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 60000 });

// Ürün kataloğunu sayfanın kendisinden al (tek doğruluk kaynağı)
await page.goto(URL);
await ready();
await settle(1500);
const catalog = process.env.CATALOG ? null : await page.evaluate(async () => {
  const src = document.querySelector('script[type="module"]')?.src;
  const m = await import(new URL('./src/data/products.js', location.href).href).catch(() => null);
  return m ? m.PRODUCTS : null;
});
// Derlenmiş tek dosyada modül yolu yoksa, katalog bilgisini DOM'dan değil sabit listeden doğrula
const PRODUCTS = catalog ?? JSON.parse(process.env.CATALOG || 'null');
check('katalog okundu', Array.isArray(PRODUCTS) && PRODUCTS.length >= 8, String(PRODUCTS?.length));

// 1) Ana sayfa
const homeCards = await page.locator('[data-collection] .pcard').count();
check('ana sayfada birden fazla parfüm kartı', homeCards >= 8, String(homeCards));
const imgsOk = await page.$$eval('[data-collection] .pcard img', (imgs) => imgs.every((i) => i.complete && i.naturalWidth > 0 && i.src.startsWith('data:image/webp')));
check('kart görselleri 3D modelden üretildi ve yüklendi', imgsOk);
check('kadın/erkek kategori girişleri', (await page.locator('[data-cat-tiles] .cat-tile').count()) === 2);
check('eski tek ürün nota bölümü kaldırıldı', (await page.locator('#notalar, .profile').count()) === 0);
await page.locator('#koleksiyon').scrollIntoViewIfNeeded();
await settle(1500);
await page.screenshot({ path: `${SHOTS}-home-collection.png` });

// 2) Kategori sayfaları
for (const [cat, lead] of [['kadin', 'echo-no-01'], ['erkek', 'afterglow']]) {
  await page.click(`.nav__links a[href="#/${cat}"]`);
  await settle(1200);
  const ids = await page.$$eval('[data-grid] .pcard a', (as) => as.map((a) => decodeURIComponent(a.getAttribute('href').split('/').pop())));
  const expected = PRODUCTS.filter((p) => p.category === cat).map((p) => p.id);
  check(`#/${cat}: ${expected.length} ürün, doğru kategori`, ids.length === expected.length && ids.every((id) => expected.includes(id)), ids.join(','));
  check(`#/${cat}: 3D modelli ürün (${lead}) burada`, ids.includes(lead));
  check(`#/${cat}: menüde aktif`, (await page.getAttribute(`.nav__links a[href="#/${cat}"]`, 'aria-current')) === 'page');
  await page.selectOption('[data-sort]', 'asc');
  const prices = await page.$$eval('[data-grid] .pcard__price', (ps) => ps.map((p) => p.firstChild.textContent));
  const nums = prices.map(num);
  check(`#/${cat}: fiyata göre artan sıralama`, nums.every((v, i) => i === 0 || nums[i - 1] <= v), nums.join(' '));
  await page.selectOption('[data-sort]', 'featured');
  await settle(300);
  await page.screenshot({ path: `${SHOTS}-cat-${cat}.png` });
}

// 3) Her ürün kartı doğru detay sayfasını açar ve kendi bilgilerini gösterir
for (const p of PRODUCTS) {
  await page.goto(`${URL}#/${p.category}`);
  await settle(700);
  await page.click(`[data-grid] a[href="#/urun/${p.id}"]`);
  await settle(900);
  const name = await text('.pdp__name');
  const price = num(await page.locator('.pdp__price').first().evaluate((el) => el.firstChild.textContent));
  const notes = await page.$$eval('.notes__col li', (li) => li.map((x) => x.textContent));
  const allNotes = [...p.notes.top, ...p.notes.heart, ...p.notes.base];
  const has3D = (await page.locator('.pdp__media--3d').count()) === 1;
  check(
    `${p.name}: ad, fiyat (${p.price}), notalar doğru${p.visual.placeholder ? '' : ', 3D model'}`,
    page.url().endsWith(`#/urun/${p.id}`) && name === p.name && price === p.price &&
      JSON.stringify(notes) === JSON.stringify(allNotes) && has3D === !p.visual.placeholder,
    `ad=${name} fiyat=${price} 3d=${has3D}`,
  );
}

// 4) Satın alma alanı: adet, ara toplam, sepete ekle
await page.goto(`${URL}#/urun/echo-no-01`);
await settle(1500);
await page.screenshot({ path: `${SHOTS}-pdp-echo.png` });
const echo = PRODUCTS.find((p) => p.id === 'echo-no-01');
await page.click('[data-buy] [data-qty-inc]');
await page.click('[data-buy] [data-qty-inc]');
check('adet 3 oldu', (await page.inputValue('[data-buy] .qty__input')) === '3');
check('ara toplam = 3 × fiyat', num(await text('[data-subtotal]')) === echo.price * 3, await text('[data-subtotal]'));
await page.click('[data-buy] [data-qty-dec]');
check('azaltınca ara toplam = 2 × fiyat', num(await text('[data-subtotal]')) === echo.price * 2);
await page.click('[data-buy] [data-qty-dec]');
check('adet 1’in altına inmez (azalt butonu 1’de kapanır)', (await page.inputValue('[data-buy] .qty__input')) === '1' && (await page.isDisabled('[data-buy] [data-qty-dec]')));
await page.fill('[data-buy] .qty__input', '500');
await page.press('[data-buy] .qty__input', 'Enter');
check('elle girilen adet stoka kırpılır', (await page.inputValue('[data-buy] .qty__input')) === String(echo.stock));
await page.fill('[data-buy] .qty__input', '2');
await page.press('[data-buy] .qty__input', 'Enter');
await page.click('[data-add]');
await settle(500);
check('sepete eklendi bildirimi', (await page.locator('.toast.is-visible').count()) === 1 && (await text('.toast')).includes('Echo No. 01'));
check('menü sayacı 2', (await text('[data-cart-count]')) === '2');
await page.screenshot({ path: `${SHOTS}-pdp-echo-added.png` });

await page.goto(`${URL}#/urun/afterglow`);
await settle(1500);
await page.screenshot({ path: `${SHOTS}-pdp-afterglow.png` });
await page.click('[data-add]');
await settle(300);
check('farklı ürün eklendi, sayaç 3', (await text('[data-cart-count]')) === '3');

// Aynı ürünü tekrar ekle → satır birleşir
await page.click('[data-add]');
await settle(300);
check('aynı ürün tekrar eklenince sayaç 4', (await text('[data-cart-count]')) === '4');

// Stok sınırı (Night Archive)
const na = PRODUCTS.find((p) => p.id === 'night-archive');
await page.goto(`${URL}#/urun/night-archive`);
await settle(1000);
await page.screenshot({ path: `${SHOTS}-pdp-placeholder.png` });
await page.fill('[data-buy] .qty__input', String(na.stock));
await page.press('[data-buy] .qty__input', 'Enter');
await page.click('[data-add]');
await settle(300);
check('stok dolunca buton kapanır', await page.isDisabled('[data-add]'), await text('[data-add]'));

// 5) Sepet
await page.click('.nav__cart');
await settle(1000);
const lines = await page.locator('.cline').count();
check('sepette 3 farklı ürün', lines === 3, String(lines));
const expectTotal = echo.price * 2 + PRODUCTS.find((p) => p.id === 'afterglow').price * 2 + na.price * na.stock;
check('genel toplam doğru', num(await text('[data-grand-total]')) === expectTotal, `${await text('[data-grand-total]')} beklenen ${expectTotal}`);
await page.screenshot({ path: `${SHOTS}-cart.png`, fullPage: true });

// Sepette adet artır (odak korunmalı)
const echoLine = page.locator('[data-line="echo-no-01"]');
await echoLine.locator('[data-qty-inc]').click();
await settle(300);
check('sepette adet artınca satır toplamı güncellenir', num(await echoLine.locator('.cline__total').innerText()) === echo.price * 3);
check('genel toplam güncellendi', num(await text('[data-grand-total]')) === expectTotal + echo.price);
check('artır butonunda odak korunur', await echoLine.locator('[data-qty-inc]').evaluate((b) => document.activeElement === b));

// Kaldır
await page.locator('[data-line="night-archive"] [data-remove]').click();
await settle(300);
check('ürün kaldırıldı', (await page.locator('.cline').count()) === 2);
check('kaldırınca toplam güncellendi', num(await text('[data-grand-total]')) === echo.price * 3 + PRODUCTS.find((p) => p.id === 'afterglow').price * 2);

// 6) Yenileme sonrası korunma
const before = await page.$$eval('.cline', (ls) => ls.map((l) => [l.dataset.line, l.querySelector('input').value]));
await page.reload();
await ready();
await settle(1200);
const after = await page.$$eval('.cline', (ls) => ls.map((l) => [l.dataset.line, l.querySelector('input').value]));
check('sayfa yenilenince sepet korunur', JSON.stringify(before) === JSON.stringify(after), JSON.stringify(after));
check('yenileme sonrası sayaç', (await text('[data-cart-count]')) === '5');

// Ödeme iddiası yok
check('ödeme butonu pasif (sahte ödeme yok)', await page.isDisabled('.summary .btn'));

// 7) Boş sepet
for (let i = 0; i < 2; i++) {
  await page.locator('[data-remove]').first().click();
  await settle(300);
}
check('boş sepet ekranı', (await page.locator('.empty').count()) === 1);
check('sayaç gizlendi', await page.locator('[data-cart-count]').isHidden());
await page.screenshot({ path: `${SHOTS}-cart-empty.png` });

// 8) Başka sayfadan ana sayfa bölümüne dönüş
await page.click('.footer a[href="#hikaye"]');
await settle(1500);
check('sepetten #hikaye → ana sayfa + bölüm', (await page.locator('[data-view="home"]').isVisible()) && (await page.evaluate(() => Math.abs(document.getElementById('hikaye').getBoundingClientRect().top) < 120)));

// 9) Bilinmeyen ürün
await page.goto(`${URL}#/urun/yok-boyle-bir-urun`);
await settle(600);
check('bilinmeyen ürün → bulunamadı sayfası', (await text('.page-title')).includes('bulunamadı'));

console.log(errors.length ? `\nKONSOL HATALARI:\n${errors.join('\n')}` : '\nKonsol hatası yok');
console.log(fail ? `\n${fail} KONTROL BAŞARISIZ` : '\nTüm kontroller geçti');
await browser.close();
process.exit(fail || errors.length ? 1 : 0);

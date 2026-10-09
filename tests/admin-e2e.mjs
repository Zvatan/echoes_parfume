import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = process.env.ROOT;
const ADMIN = process.env.ADMIN || `${ROOT}admin.html`;
const SITE = process.env.SITE || `${ROOT}index.html`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const errors = [];
const watch = (p, tag) => {
  p.on('pageerror', (e) => errors.push(`${tag} pageerror: ${e.message}`));
  p.on('console', (m) => m.type() === 'error' && errors.push(`${tag} console: ${m.text()}`));
};
let fail = 0;
const check = (l, ok, x = '') => { if (!ok) fail++; console.log(`${ok ? '✓' : '✗'} ${l}${!ok && x ? ` → ${x}` : ''}`); };
const num = (s) => Number(String(s).replace(/[^\d,]/g, '').replace(',', '.'));
const wait = (p, ms = 500) => p.waitForTimeout(ms);

const admin = await ctx.newPage();
watch(admin, 'panel');
let dialogs = [];
let dialogAnswer = true;
admin.on('dialog', (d) => { dialogs.push(d.message()); dialogAnswer ? d.accept() : d.dismiss(); });

await admin.goto(ADMIN);
await admin.waitForSelector('.table tbody tr');
check('panel açıldı, demo modu rozeti', (await admin.locator('.mode').innerText()).toLowerCase() === 'demo');
check('demo uyarısı açıkça görünüyor', (await admin.locator('.demo-bar').innerText()).includes('yalnızca bu tarayıcıda'));
check('demo uyarısı herkese açık sitenin göremeyeceğini söyler', (await admin.locator('.demo-bar').innerText()).includes('GitHub Pages'));
check('8 ürün listelendi', (await admin.locator('.table tbody tr').count()) === 8);
check('özet: Toplam 8', (await admin.locator('[data-stats]').innerText()).includes('Toplam: 8'));
await admin.screenshot({ path: 'adm-list.png' });

// Arama ve filtre
await admin.fill('[data-q]', 'iris');
await wait(admin, 200);
const irisNames = await admin.$$eval('.table tbody tr .prod a', (a) => a.map((x) => x.textContent));
check('nota ile arama ("iris")', irisNames.length === 2 && irisNames.includes('Echo No. 01') && irisNames.includes('Paper Moon'), irisNames.join(','));
await admin.fill('[data-q]', '');
await admin.selectOption('[data-cat]', 'erkek');
await wait(admin, 200);
check('kategori filtresi (erkek → 4)', (await admin.locator('.table tbody tr').count()) === 4);
await admin.selectOption('[data-cat]', '');
await admin.selectOption('[data-sort]', 'priceAsc');
const prices = (await admin.$$eval('.table tbody td.num:nth-of-type(3)', (t) => t.map((x) => x.textContent))).map(num);
check('fiyata göre sıralama', prices.every((v, i) => !i || prices[i - 1] <= v), prices.join(' '));
await admin.selectOption('[data-sort]', 'order');

// 1) Fiyat düzenleme
await admin.click('.table a:has-text("Echo No. 01")');
await admin.waitForSelector('#f-price_kurus');
check('düzenleme: mevcut fiyat "2.850"', (await admin.inputValue('#f-price_kurus')) === '2.850');
check('başlangıçta "Tüm değişiklikler kayıtlı"', (await admin.locator('[data-dirty]').innerText()).includes('kayıtlı'));
await admin.fill('#f-price_kurus', '3100');
await admin.locator('#f-price_kurus').blur();
check('fiyat biçimlenir (3100 → 3.100)', (await admin.inputValue('#f-price_kurus')) === '3.100');
check('kaydedilmemiş değişiklik uyarısı', (await admin.locator('[data-dirty]').innerText()).includes('Kaydedilmemiş'));
await admin.keyboard.press('Control+s');
await wait(admin, 600);
check('Ctrl+S ile kaydedildi', (await admin.locator('[data-toast]').innerText()).includes('kaydedildi'));
check('kayıttan sonra temiz durum', (await admin.locator('[data-dirty]').innerText()).includes('kayıtlı'));

// 2) Doğrulama
await admin.fill('#f-name', '');
await admin.fill('#f-price_kurus', '-5');
await admin.click('[data-save]');
await wait(admin, 400);
const errText = await admin.locator('[data-errors]').innerText();
check('boş ad ve geçersiz fiyat kaydedilmez', errText.includes('2 alanı') && errText.includes('Ürün adı') && errText.includes('Fiyat'), errText);
check('alan yanında hata mesajı', (await admin.locator('[data-error="name"]').innerText()).includes('gerekli'));
check('hatalı alan aria-invalid', (await admin.getAttribute('#f-name', 'aria-invalid')) === 'true');

// 3) Kaydedilmemiş değişiklik koruması
dialogs = [];
dialogAnswer = false;
await admin.click('.tabs a[data-tab="urunler"]');
await wait(admin, 400);
check('çıkarken onay sorulur ve "hayır" ile sayfada kalınır', dialogs.some((m) => m.includes('Kaydedilmemiş')) && (await admin.locator('#f-name').count()) === 1);
dialogAnswer = true;
await admin.click('[data-revert]');
await wait(admin, 300);
check('"geri al" ile alanlar eski haline döner', (await admin.inputValue('#f-name')) === 'Echo No. 01' && (await admin.inputValue('#f-price_kurus')) === '3.100');

// 4) Yeni ürün
await admin.goto(`${ADMIN}#/yeni`);
await admin.waitForSelector('#f-name');
check('fotoğraf yokken "Fotoğrafı kaldır" görünmez', !(await admin.locator('[data-remove-photo]').isVisible()));
check('kaydedilmemiş üründe "Sitede görüntüle" görünmez', !(await admin.locator('[data-view-site]').isVisible()));
await admin.fill('#f-name', 'Gece Mavisi');
check('ad yazılınca adres otomatik oluşur', (await admin.inputValue('#f-slug')) === 'gece-mavisi');
await admin.selectOption('#f-category_id', 'erkek');
await admin.fill('#f-price_kurus', '2.100,50');
await admin.fill('#f-volume_ml', '100');
await admin.fill('#f-stock', '5');
await admin.fill('#f-short_description', 'Gece yarısı denizi ve soğuk mineral.');
for (const [k, notes] of [['notes_top', ['Deniz tuzu', 'Bergamot']], ['notes_heart', ['Lavanta']], ['notes_base', ['Vetiver', 'Misk']]]) {
  const inp = admin.locator(`[data-chips="${k}"] input`);
  for (const n of notes) {
    await inp.fill(n);
    await inp.press('Enter');
  }
}
check('notalar etiket olarak eklendi', (await admin.locator('[data-chips="notes_top"] .chip').count()) === 2);
await admin.selectOption('#f-model', 'clear');
await admin.locator('[data-tint="liquid"]').evaluate((el) => {
  el.value = '#2f4f7a';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await admin.check('[name="status"][value="published"]', { force: true });
await admin.click('[data-save]');
await admin.waitForFunction(() => /#\/urun\/[0-9a-f-]{36}$/.test(location.hash), null, { timeout: 5000 }).catch(() => {});
check('yeni ürün oluşturuldu ve düzenleme sayfasına geçildi', /#\/urun\/[0-9a-f-]{36}$/.test(admin.url()), admin.url());
check('yeni ürün fiyatı "2.100,50"', (await admin.inputValue('#f-price_kurus')) === '2.100,50');
await admin.screenshot({ path: 'adm-edit.png', fullPage: true });

// 4b) Durum seçmeden kaydedilen ürün taslak olur: panel bunu açıkça söyler, tek tıkla yayınlanır
await admin.goto(`${ADMIN}#/yeni`);
await admin.waitForSelector('#f-name');
check('yeni ürün formunda "sitede görünmüyor (Taslak)" uyarısı', (await admin.locator('[data-visibility]').innerText()).includes('Taslak'));
await admin.fill('#f-name', 'Taslak Deneme');
await admin.fill('#f-price_kurus', '1.500');
await admin.fill('#f-short_description', 'Deneme ürünü.');
await admin.click('[data-save]');
await admin.waitForFunction(() => /#\/urun\/[0-9a-f-]{36}$/.test(location.hash), null, { timeout: 5000 }).catch(() => {});
check('kayıt bildirimi taslağın sitede görünmediğini söyler', (await admin.locator('[data-toast]').innerText()).includes('sitede görünmüyor'));
const draftSite = await ctx.newPage();
await draftSite.goto(`${SITE}#/kadin`);
await draftSite.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 60000 });
await wait(draftSite, 600);
check('taslak ürün sitede görünmez', (await draftSite.locator('[data-grid] a[href="#/urun/taslak-deneme"]').count()) === 0);
await admin.click('[data-publish]');
await wait(admin, 700);
check('"Yayınla ve kaydet" → durum Yayında, uyarı kalkar', (await admin.locator('[name="status"]:checked').getAttribute('value')) === 'published' && !(await admin.locator('[data-visibility]').isVisible()));
await draftSite.reload();
await draftSite.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 60000 });
await wait(draftSite, 600);
check('yayınlanan ürün sitede görünür', (await draftSite.locator('[data-grid] a[href="#/urun/taslak-deneme"]').count()) === 1);
await draftSite.close();

// 5) Aynı adres engellenir
await admin.goto(`${ADMIN}#/yeni`);
await admin.waitForSelector('#f-name');
await admin.fill('#f-name', 'Kopya');
await admin.fill('#f-slug', 'echo-no-01');
await admin.fill('#f-price_kurus', '100');
await admin.click('[data-save]');
await wait(admin, 400);
check('aynı adres reddedilir', (await admin.locator('[data-error="slug"]').innerText()).includes('başka bir üründe'));
await admin.goto(`${ADMIN}#/urunler`);
await wait(admin, 600);

// 6) Fotoğraf yükleme (Silent Bloom)
await admin.click('.table a:has-text("Silent Bloom")');
await admin.waitForSelector('[data-file]', { state: 'attached' });
await admin.setInputFiles('[data-file]', fileURLToPath(new URL('./fixtures/test-photo.png', import.meta.url)));
await admin.waitForFunction(() => document.querySelector('[data-preview]').src.startsWith('data:image/webp'), null, { timeout: 8000 }).catch(() => {});
check('fotoğraf yüklendi ve önizlemede', (await admin.getAttribute('[data-preview]', 'src')).startsWith('data:image/webp'));
check('fotoğraf varken "Fotoğrafı kaldır" görünür', await admin.locator('[data-remove-photo]').isVisible());
await admin.click('[data-save]');
await wait(admin, 500);

// 7) Sitede yansıması (aynı tarayıcı)
const site = await ctx.newPage();
watch(site, 'site');
await site.goto(`${SITE}#/urun/echo-no-01`);
await site.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 60000 });
await wait(site, 800);
check('sitede yeni fiyat: ₺3.100', num(await site.locator('.pdp__price').evaluate((e) => e.firstChild.textContent)) === 3100);
check('sitede demo uyarısı görünüyor', (await site.locator('.demo-flag').count()) === 1);
// Arşivlenecek ürünü önce sepete ekle
await site.goto(`${SITE}#/urun/velvet-trace`);
await wait(site, 800);
await site.click('[data-add]');
await wait(site, 300);
await site.goto(`${SITE}#/erkek`);
await wait(site, 900);
const men = await site.$$eval('[data-grid] .pcard__name', (n) => n.map((x) => x.textContent));
check('yeni ürün sitede Erkek kategorisinde', men.includes('Gece Mavisi') && men.length === 5, men.join(','));
await site.click('[data-grid] a[href="#/urun/gece-mavisi"]');
await wait(site, 900);
check('yeni ürün sayfası: ad, fiyat, notalar', (await site.locator('.pdp__name').innerText()) === 'Gece Mavisi' &&
  (await site.locator('.pdp__price').evaluate((e) => e.firstChild.textContent)).includes('2.100,5') &&
  (await site.$$eval('.notes__col li', (l) => l.map((x) => x.textContent).join(','))) === 'Deniz tuzu,Bergamot,Lavanta,Vetiver,Misk');
await site.screenshot({ path: 'adm-site-new.png' });
await site.goto(`${SITE}#/kadin`);
await wait(site, 900);
const sbImg = await site.locator('[data-grid] a[href="#/urun/silent-bloom"] img').getAttribute('src');
check('yüklenen fotoğraf sitede ürün kartında', sbImg.startsWith('data:image/webp'));

// 8) Arşivleme → sitede kaybolur, sepetten düşer
await admin.goto(`${ADMIN}#/urunler`);
await wait(admin, 500);
await admin.click('.table a:has-text("Velvet Trace")');
await admin.waitForSelector('#f-name');
await admin.check('[name="status"][value="archived"]', { force: true });
await admin.click('[data-save]');
await wait(admin, 500);
await site.reload();
await site.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 60000 });
await wait(site, 900);
const women = await site.$$eval('[data-grid] .pcard__name', (n) => n.map((x) => x.textContent));
check('arşivlenen ürün sitede görünmez, diğerleri yerinde', !women.includes('Velvet Trace') && ['Echo No. 01', 'Silent Bloom', 'Salt Letters', 'Taslak Deneme'].every((n) => women.includes(n)), women.join(','));
await site.goto(`${SITE}#/sepet`);
await wait(site, 700);
check('arşivlenen ürün sepetten düştü', (await site.locator('[data-line="velvet-trace"]').count()) === 0);

// 9) Değişiklik geçmişi
await admin.goto(`${ADMIN}#/gecmis`);
await admin.waitForSelector('.history li');
const hist = await admin.locator('.history').innerText();
check('geçmiş: fiyat değişikliği eski → yeni', hist.includes('Fiyat') && hist.includes('₺2.850') && hist.includes('₺3.100'));
check('geçmiş: yeni ürün ve arşivleme', hist.includes('Gece Mavisi') && hist.includes('Arşivde'));
const velvetEntry = await admin.locator('.history li', { hasText: 'Velvet Trace' }).first().innerText();
check('geçmiş: değişmeyen alan (Görsel) listelenmez', !velvetEntry.includes('Görsel'), velvetEntry);
await admin.screenshot({ path: 'adm-history.png' });

// 10) Demo verisini sıfırla
await admin.click('[data-reset]');
await wait(admin, 600);
check('sıfırlama: 8 ürün, Echo No. 01 yine ₺2.850', (await admin.locator('.table tbody tr').count()) === 8 &&
  (await admin.locator('tr:has-text("Echo No. 01") td.num').first().innerText()).includes('2.850'));

// 11) Mobil düzen
await admin.setViewportSize({ width: 390, height: 844 });
await admin.goto(`${ADMIN}#/urunler`);
await wait(admin, 600);
check('mobil liste: yatay taşma yok', (await admin.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
await admin.screenshot({ path: 'adm-mobile-list.png' });
await admin.click('.table a:has-text("Afterglow")');
await admin.waitForSelector('#f-name');
check('mobil düzenleme: yatay taşma yok', (await admin.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
await admin.screenshot({ path: 'adm-mobile-edit.png' });

console.log(errors.length ? `\nKONSOL HATALARI:\n${errors.join('\n')}` : '\nKonsol hatası yok');
console.log(fail ? `${fail} KONTROL BAŞARISIZ` : 'Tüm panel kontrolleri geçti');
await browser.close();
process.exit(fail || errors.length ? 1 : 0);

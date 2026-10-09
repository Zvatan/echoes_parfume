import { chromium } from 'playwright';
const URL = process.env.URL;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
let fail = 0;
const check = (l, ok, x = '') => { if (!ok) fail++; console.log(`${ok ? '✓' : '✗'} ${l}${!ok && x ? ` → ${x}` : ''}`); };
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

await page.goto(URL);
await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 60000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: 'm-home.png' });
check('ana sayfa: yatay taşma yok', (await overflow()) <= 0, String(await overflow()));

// Mobil menü → Erkek Parfümleri
await page.tap('.nav__toggle');
await page.waitForTimeout(500);
await page.screenshot({ path: 'm-menu.png' });
await page.tap('.nav__links a[href="#/erkek"]');
await page.waitForTimeout(1200);
check('mobil menüden kategoriye geçiş', page.url().endsWith('#/erkek') && (await page.locator('[data-grid] .pcard').count()) === 4);
check('kategori: yatay taşma yok', (await overflow()) <= 0, String(await overflow()));
await page.screenshot({ path: 'm-cat.png' });
await page.screenshot({ path: 'm-cat-full.png', fullPage: true });

// Ürün sayfası (3D)
await page.tap('[data-grid] a[href="#/urun/afterglow"]');
await page.waitForTimeout(2000);
check('ürün sayfası açıldı', (await page.locator('.pdp__name').innerText()) === 'Afterglow');
check('ürün: yatay taşma yok', (await overflow()) <= 0, String(await overflow()));
await page.screenshot({ path: 'm-pdp.png' });
const box = await page.locator('[data-add]').boundingBox();
check('Sepete Ekle butonu dokunmaya uygun (≥44px)', box.height >= 44, String(box.height));
const inc = await page.locator('[data-buy] [data-qty-inc]').boundingBox();
check('adet butonları ≥44px', inc.height >= 44 && inc.width >= 44, `${inc.width}x${inc.height}`);
await page.tap('[data-buy] [data-qty-inc]');
await page.tap('[data-add]');
await page.waitForTimeout(600);
await page.screenshot({ path: 'm-pdp-added.png' });
check('mobilde sepete eklendi, sayaç 2', (await page.locator('[data-cart-count]').innerText()) === '2');

// Sayfa kaydırılınca 3D şişe kutusuyla birlikte gider
await page.evaluate(() => window.scrollTo(0, 700));
await page.waitForTimeout(1500);
await page.screenshot({ path: 'm-pdp-scrolled.png' });

// Sepet
await page.tap('.nav__cart');
await page.waitForTimeout(1200);
check('sepet: yatay taşma yok', (await overflow()) <= 0, String(await overflow()));
check('toast yeni sayfada gizli', (await page.locator('.toast.is-visible').count()) === 0);
await page.screenshot({ path: 'm-cart.png', fullPage: true });

console.log(errors.length ? `\nKONSOL HATALARI:\n${errors.join('\n')}` : '\nKonsol hatası yok');
console.log(fail ? `${fail} KONTROL BAŞARISIZ` : 'Tüm mobil kontroller geçti');
await browser.close();
process.exit(fail || errors.length ? 1 : 0);

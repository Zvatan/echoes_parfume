import { chromium } from 'playwright';
const URL = process.env.URL;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
let fail = 0;
const check = (l, ok, x = '') => { if (!ok) fail++; console.log(`${ok ? '✓' : '✗'} ${l}${!ok && x ? ` → ${x}` : ''}`); };

// Doğrudan ürün sayfasıyla aç, sonra logoyla ana sayfaya dön
await page.goto(`${URL}#/urun/afterglow`);
await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.click('.nav__logo');
await page.waitForTimeout(2500);
check('logo → ana sayfa', await page.locator('[data-view="home"]').isVisible());
await page.screenshot({ path: 'r-0-hero.png' });

const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
check('pin aralıkları yeniden kuruldu (sayfa uzun)', total > 8000, String(total));
const positions = { story: 0.16, anatomyCap: 0.5, collection: 0.83, outro: 0.97 };
for (const [name, f] of Object.entries(positions)) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * f));
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `r-${name}.png` });
}
const theme = await page.evaluate(() => { window.scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * 0.5)); return new Promise((r) => setTimeout(() => r(document.documentElement.dataset.theme), 1500)); });
check('şişe bölümünde koyu tema devrede', theme === 'dark', theme);
// Ana sayfa → kategori → geri tuşu
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);
await page.click('.hero__aside a[href="#/kadin"]');
await page.waitForTimeout(1000);
check('hero → Kadın Parfümleri', page.url().endsWith('#/kadin'));
check('kategori sayfasında tema açık', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light');
await page.goBack();
await page.waitForTimeout(2000);
check('tarayıcı geri tuşu → ana sayfa', await page.locator('[data-view="home"]').isVisible());
console.log(errors.length ? `KONSOL HATALARI:\n${errors.join('\n')}` : 'Konsol hatası yok');
console.log(fail ? `${fail} KONTROL BAŞARISIZ` : 'Tüm kontroller geçti');
await browser.close();
process.exit(fail || errors.length ? 1 : 0);

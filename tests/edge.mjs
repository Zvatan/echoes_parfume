import { chromium } from 'playwright';
const URL = process.env.URL;
let fail = 0;
const check = (l, ok, x = '') => { if (!ok) fail++; console.log(`${ok ? '✓' : '✗'} ${l}${!ok && x ? ` → ${x}` : ''}`); };

for (const mode of ['nowebgl', 'reduced']) {
  const browser = await chromium.launch({ args: mode === 'nowebgl' ? ['--disable-3d-apis'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL);
  await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  console.log(`--- ${mode} ---`);
  const imgs = await page.$$eval('[data-collection] img', (i) => i.map((x) => x.src.slice(5, 18)));
  check('koleksiyon kartlarında görsel var', imgs.length === 8 && imgs.every(Boolean), imgs.join(','));
  if (mode === 'nowebgl') check('WebGL yokken SVG yedek görseller', imgs.every((s) => s.startsWith('image/svg')));
  await page.goto(`${URL}#/urun/echo-no-01`);
  await page.waitForTimeout(1000);
  if (mode === 'nowebgl') check('3D yokken ürün sayfası görsel + dürüst not', (await page.locator('.pdp__media figcaption').innerText()).includes('3D model bu cihazda'));
  else check('azaltılmış harekette 3D ürün sayfası', (await page.locator('.pdp__media--3d').count()) === 1);
  await page.click('[data-add]');
  await page.waitForTimeout(400);
  check('sepete ekleme çalışıyor', (await page.locator('[data-cart-count]').innerText()) === '1');
  await page.goto(`${URL}#/sepet`);
  await page.waitForTimeout(800);
  check('sepet sayfasında ürün', (await page.locator('.cline').count()) === 1);
  await page.screenshot({ path: `edge-${mode}.png` });
  await page.goto(`${URL}#hikaye`);
  await page.waitForTimeout(1500);
  check('ana sayfa bölümüne gidiş', await page.evaluate(() => Math.abs(document.getElementById('hikaye').getBoundingClientRect().top) < 120));
  check('konsol hatası yok', errors.length === 0, errors.join(' | '));
  await browser.close();
}
console.log(fail ? `${fail} KONTROL BAŞARISIZ` : 'Tüm uç durum kontrolleri geçti');
process.exit(fail ? 1 : 0);

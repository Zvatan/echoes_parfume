// GERÇEK Supabase projesine karşı doğrulama: npm run test:real
// Yalnızca okuma ve zararsız denemeler yapar; hiçbir veriyi değiştirmez.
// Yayın derlemesini (kökteki index.html ve admin.html, çift tıklama yolu) kullanır.
// Beklenen değerler sabit değil, veritabanından okunur (panelde yapılan değişiklikler testi bozmaz).
import { chromium } from 'playwright';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const cfg = readFileSync(new URL('../src/config.js', import.meta.url), 'utf8');
const URL_ = cfg.match(/PROJECT_URL = '([^']*)'/)?.[1];
const KEY = cfg.match(/PUBLISHABLE_KEY = '([^']*)'/)?.[1];
if (!URL_ || !KEY) {
  console.log('src/config.js içinde PROJECT_URL / PUBLISHABLE_KEY yok; gerçek proje testi atlandı.');
  process.exit(0);
}
// ROOT: test edilecek klasör (varsayılan: bu depo). Ör. ROOT=file:///…/site_taslak/
const ROOT = process.env.ROOT || pathToFileURL(fileURLToPath(new URL('..', import.meta.url))).href;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

let fail = 0;
const check = (l, ok, x = '') => { if (!ok) fail++; console.log(`${ok ? '✓' : '✗'} ${l}${!ok && x ? ` → ${x}` : ''}`); };
const rest = async (path, init = {}) => {
  const r = await fetch(`${URL_}${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const num = (s) => Number(String(s).replace(/[^\d,]/g, '').replace(',', '.'));

// --- 1) Veritabanı ve güvenlik (ziyaretçi anahtarıyla) ---
const cats = await rest('/rest/v1/categories?select=id,title&order=sort_order.asc');
const prods = await rest('/rest/v1/products?select=slug,name,category_id,price_kurus,status&order=sort_order.asc');
check('kategoriler okunuyor', cats.status === 200 && cats.json.length >= 1, JSON.stringify(cats.json));
check('ürünler okunuyor', prods.status === 200 && prods.json.length >= 1, String(prods.status));
check('ziyaretçi yalnızca yayındaki ürünleri görür', prods.json.every((p) => p.status === 'published'));
const denied = (r) => r.status === 401 || r.status === 403 || r.json?.code === '42501';
check('ziyaretçi fiyat güncelleyemez', denied(await rest('/rest/v1/products?id=eq.00000000-0000-0000-0000-000000000000', { method: 'PATCH', body: '{"price_kurus":1}' })));
check('ziyaretçi ürün ekleyemez', denied(await rest('/rest/v1/products', { method: 'POST', body: '{"slug":"probe-yetki","name":"p","category_id":"kadin","price_kurus":-1,"volume_ml":50}' })));
check('ziyaretçi kendini yönetici yapamaz', denied(await rest('/rest/v1/admins', { method: 'POST', body: '{"user_id":"00000000-0000-0000-0000-000000000000","role":"owner"}' })));
check('değişiklik kaydı ziyaretçiye kapalı', (await rest('/rest/v1/audit_log?select=id&limit=1')).json?.length === 0);
check('yönetici listesi ziyaretçiye kapalı', (await rest('/rest/v1/admins?select=user_id&limit=1')).json?.length === 0);
check('is_admin() ziyaretçi için false', (await rest('/rest/v1/rpc/is_admin', { method: 'POST', body: '{}' })).json === false);
const bucket = await rest('/storage/v1/object/public/product-images/__deneme__.png');
check('fotoğraf kovası kurulu', bucket.json?.message === 'Object not found', JSON.stringify(bucket.json));

// --- 2) Site (çift tıklama) gerçek veritabanından okur ---
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
const sbResponses = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('response', (r) => r.url().startsWith(`${URL_}/rest/v1/`) && sbResponses.push(r.status()));
await page.goto(`${ROOT}index.html#/kadin`);
await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 60000 });
await page.waitForTimeout(800);
check('site (file://) veritabanına bağlandı: 200 yanıtı', sbResponses.length >= 2 && sbResponses.every((s) => s === 200), sbResponses.join(','));
check('sitede demo uyarısı yok', (await page.locator('.demo-flag').count()) === 0);
for (const c of cats.json) {
  await page.goto(`${ROOT}index.html#/${c.id}`);
  await page.waitForTimeout(700);
  const shown = await page.$$eval('[data-grid] .pcard__name', (n) => n.map((x) => x.textContent));
  const expected = prods.json.filter((p) => p.category_id === c.id).map((p) => p.name);
  check(`${c.title}: sitedeki ürünler = veritabanı (${expected.length})`, shown.length === expected.length && expected.every((n) => shown.includes(n)), shown.join(', '));
}
const first = prods.json[0];
await page.goto(`${ROOT}index.html#/urun/${first.slug}`);
await page.waitForTimeout(900);
const price = num(await page.locator('.pdp__price').evaluate((e) => e.firstChild.textContent));
check(`ürün sayfası fiyatı = veritabanı (${first.name})`, price === first.price_kurus / 100, `${price} / ${first.price_kurus / 100}`);
check('sitede konsol hatası yok', errors.length === 0, errors.join(' | '));

// --- 3) Panel canlı modda açılır, giriş servisi çalışır ---
const admin = await ctx.newPage();
const aErrors = [];
admin.on('pageerror', (e) => aErrors.push(e.message));
await admin.goto(`${ROOT}admin.html`);
await admin.waitForSelector('#email', { timeout: 15000 }).catch(() => {});
check('panel canlı modda: giriş ekranı', (await admin.locator('.login h1').count()) === 1 && (await admin.locator('.demo-bar').count()) === 0);
await admin.fill('#email', 'olmayan-kullanici@example.com');
await admin.fill('#password', 'yanlis-sifre-123');
await admin.click('form button[type="submit"]');
await admin.waitForSelector('.form-error', { timeout: 15000 }).catch(() => {});
check('gerçek giriş servisi: yanlış bilgide Türkçe hata', (await admin.locator('.form-error').innerText().catch(() => '')).includes('E-posta veya şifre hatalı'));
check('panelde sayfa hatası yok', aErrors.length === 0, aErrors.join(' | '));

await browser.close();
console.log(fail ? `\n${fail} KONTROL BAŞARISIZ` : '\nGerçek proje kontrollerinin hepsi geçti');
process.exit(fail ? 1 : 0);

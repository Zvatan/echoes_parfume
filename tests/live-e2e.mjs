// Supabase (canlı mod) kod yolunun testi: Supabase'in Auth + PostgREST yanıtları taklit edilir.
import { chromium } from 'playwright';

const BASE = process.env.BASE;
const SB = 'https://test-proj.supabase.co';
const ANON = 'test-anon-key';
const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const TOKEN = { [ADMIN_ID]: 'tok-admin', [USER_ID]: 'tok-user' };
const catalog = JSON.parse(process.env.CATALOG);

// Sahte veritabanı (seed ile aynı veri)
const now = new Date().toISOString();
const categories = [
  { id: 'kadin', title: 'Kadın Parfümleri', short_title: 'Kadın', intro: 'K', sort_order: 0, updated_at: now },
  { id: 'erkek', title: 'Erkek Parfümleri', short_title: 'Erkek', intro: 'E', sort_order: 1, updated_at: now },
];
let products = catalog.map((p, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  slug: p.id, name: p.name, category_id: p.category, status: 'published', price_kurus: p.price * 100, currency: 'TRY',
  volume_ml: p.volume, concentration: p.concentration, short_description: p.short, description: p.description,
  notes_top: p.notes.top, notes_heart: p.notes.heart, notes_base: p.notes.base, character: p.character,
  longevity: p.longevity, usage: p.usage, stock: p.stock, visual: p.visual, image_path: null, is_sample: true,
  sort_order: i, created_at: now, updated_at: now, updated_by: null,
}));
// Veritabanında gerçek veriyle güncellenmiş bir ürün (sitenin veritabanından okuduğunu kanıtlar)
products[0].price_kurus = 999900;
products[0].is_sample = false;
// Taslak ürün: ziyaretçi görmemeli
products[7].status = 'draft';

const log = { patches: [], authHeaders: new Set(), storefrontApikey: null };
let sbDown = false;

async function handle(route) {
  const req = route.request();
  const url = new URL(req.url());
  const auth = req.headers()['authorization'] || '';
  const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  if (sbDown) return route.abort('connectionrefused');

  // --- Auth ---
  if (url.pathname === '/auth/v1/token') {
    const { email, password } = req.postDataJSON();
    if (email === 'onaysiz@echoes.test') return json(400, { code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' });
    const uid = email === 'admin@echoes.test' && password === 'dogru-sifre' ? ADMIN_ID : email === 'user@echoes.test' && password === 'dogru-sifre' ? USER_ID : null;
    if (!uid) return json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    return json(200, {
      access_token: TOKEN[uid], token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r-' + uid,
      user: { id: uid, aud: 'authenticated', role: 'authenticated', email, app_metadata: {}, user_metadata: {}, created_at: now },
    });
  }
  if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
  if (url.pathname === '/auth/v1/user') {
    const uid = Object.keys(TOKEN).find((k) => auth === `Bearer ${TOKEN[k]}`);
    return uid ? json(200, { id: uid, aud: 'authenticated', role: 'authenticated', email: 'x' }) : json(401, { msg: 'no' });
  }

  // --- REST ---
  const uid = Object.keys(TOKEN).find((k) => auth === `Bearer ${TOKEN[k]}`) ?? null;
  const isAdmin = uid === ADMIN_ID;
  if (url.pathname.startsWith('/rest/v1/')) log.authHeaders.add(auth.slice(0, 20));
  const single = (req.headers()['accept'] || '').includes('vnd.pgrst.object');

  if (url.pathname === '/rest/v1/rpc/is_admin') return json(200, isAdmin);
  if (url.pathname === '/rest/v1/categories') return json(200, categories);
  if (url.pathname === '/rest/v1/products') {
    if (!uid) log.storefrontApikey = req.headers()['apikey'];
    let rows = isAdmin ? products : products.filter((p) => p.status === 'published');
    const idEq = url.searchParams.get('id')?.replace('eq.', '');
    if (url.searchParams.get('status') === 'eq.published') rows = rows.filter((p) => p.status === 'published');
    if (req.method() === 'GET') {
      if (idEq) rows = rows.filter((p) => p.id === idEq);
      return single ? (rows[0] ? json(200, rows[0]) : json(406, { code: 'PGRST116', message: 'no rows' })) : json(200, rows);
    }
    if (req.method() === 'PATCH') {
      const body = req.postDataJSON();
      log.patches.push({ body, auth });
      if (!isAdmin) return json(403, { code: '42501', message: 'new row violates row-level security policy for table "products"' });
      if (products.some((p) => p.slug === body.slug && p.id !== idEq)) return json(409, { code: '23505', message: 'duplicate key value violates unique constraint "products_slug_key"' });
      const i = products.findIndex((p) => p.id === idEq);
      products[i] = { ...products[i], ...body, updated_at: new Date().toISOString(), updated_by: uid };
      return json(200, single ? products[i] : [products[i]]);
    }
  }
  if (url.pathname === '/rest/v1/audit_log') return json(200, []);
  return json(404, { message: 'mock: bilinmeyen uç ' + url.pathname });
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let fail = 0;
const check = (l, ok, x = '') => { if (!ok) fail++; console.log(`${ok ? '✓' : '✗'} ${l}${!ok && x ? ` → ${x}` : ''}`); };
const num = (s) => Number(String(s).replace(/[^\d,]/g, '').replace(',', '.'));

// ---------- 1) Site veritabanından okur ----------
let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(`${SB}/**`, handle);
let errors = [];
let page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`${BASE}#/urun/echo-no-01`);
await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 60000 });
await page.waitForTimeout(800);
check('site: fiyat veritabanından (₺9.999)', num(await page.locator('.pdp__price').evaluate((e) => e.firstChild.textContent)) === 9999);
check('site: gerçek veri olan üründe "örnek veri" notu yok', (await page.locator('.pdp .sample-note').count()) === 0);
check('site: demo uyarısı yok (canlı katalog)', (await page.locator('.demo-flag').count()) === 0);
check('site: istek anon anahtarıyla yapıldı', log.storefrontApikey === ANON);
await page.goto(`${BASE}#/erkek`);
await page.waitForTimeout(800);
check('site: taslak ürün (Rain Theory) görünmez', (await page.locator('[data-grid] .pcard').count()) === 3);

// Supabase çökerse: son başarılı katalog (önbellek)
sbDown = true;
await page.reload();
await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 60000 });
await page.goto(`${BASE}#/urun/echo-no-01`);
await page.waitForTimeout(800);
check('site: veritabanına ulaşılamazsa önbellekteki katalog (₺9.999)', num(await page.locator('.pdp__price').evaluate((e) => e.firstChild.textContent)) === 9999);
check('site: bu durumda konsola hata değil uyarı düşer', errors.filter((e) => !/ERR_CONNECTION_REFUSED|Failed to load resource/.test(e)).length === 0, errors.join(' | '));
await ctx.close();

// Hiç önbellek yokken çöküş → örnek katalog
ctx = await browser.newContext();
await ctx.route(`${SB}/**`, handle);
page = await ctx.newPage();
await page.goto(`${BASE}#/urun/echo-no-01`);
await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 60000 });
await page.waitForTimeout(800);
check('site: önbellek de yoksa örnek katalog (₺2.850)', num(await page.locator('.pdp__price').evaluate((e) => e.firstChild.textContent)) === 2850);
sbDown = false;
await ctx.close();

// ---------- 2) Panel: giriş ve yetki ----------
ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(`${SB}/**`, handle);
page = await ctx.newPage();
errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}admin/`);
await page.waitForSelector('form #email');
check('panel: oturum yokken giriş ekranı', (await page.locator('.login h1').innerText()) === 'Yönetim paneli');
const login = async (email, pw) => {
  await page.fill('#email', email);
  await page.fill('#password', pw);
  await page.click('form button[type="submit"]');
  await page.waitForTimeout(800);
};
await login('admin@echoes.test', 'yanlis');
check('yanlış şifre → "E-posta veya şifre hatalı."', (await page.locator('.form-error').innerText()).includes('E-posta veya şifre hatalı'));
check('giriş ekranı hangi hesabın kullanılacağını açıklar', (await page.locator('.login__help').innerText()).includes('Authentication → Users'));
await login('onaysiz@echoes.test', 'dogru-sifre');
check('doğrulanmamış e-posta → ne yapılacağını söyleyen Türkçe mesaj', (await page.locator('.form-error').innerText()).includes('doğrulanmamış'));
await login('user@echoes.test', 'dogru-sifre');
check('yönetici olmayan hesap → reddedilir', (await page.locator('.form-error').innerText()).includes('yönetici yetkisi yok'));
await login('admin@echoes.test', 'dogru-sifre');
await page.waitForSelector('.table tbody tr', { timeout: 5000 }).catch(() => {});
check('yönetici girişi → ürün listesi (taslak dahil 8)', (await page.locator('.table tbody tr').count()) === 8);
check('canlı mod rozeti, demo uyarısı yok', (await page.locator('.mode').innerText()).toLocaleLowerCase('tr') === 'canlı' && (await page.locator('.demo-bar').count()) === 0);

// Ürün güncelleme
await page.click('.table a:has-text("Afterglow")');
await page.waitForSelector('#f-price_kurus');
await page.fill('#f-price_kurus', '3.100');
await page.click('[data-save]');
await page.waitForTimeout(800);
const patch = log.patches.at(-1);
check('kaydet → PATCH, doğru fiyat (310000 kuruş)', patch?.body?.price_kurus === 310000);
check('salt-okunur alanlar gönderilmez (id, updated_at…)', patch && !('id' in patch.body) && !('updated_at' in patch.body) && !('updated_by' in patch.body));
check('istek kullanıcının oturum anahtarıyla', patch?.auth === 'Bearer tok-admin');
check('kayıt bildirimi', (await page.locator('[data-toast]').innerText()).includes('kaydedildi'));

// Veritabanı hata eşleme: aynı adres
await page.fill('#f-slug', 'echo-no-01');
await page.locator('#f-slug').blur();
await page.click('[data-save]');
await page.waitForTimeout(600);
check('istemci tarafı: aynı adres yakalanır', (await page.locator('[data-error="slug"]').innerText()).includes('başka bir üründe'));

// Sayfa yenilenince oturum korunur
await page.reload();
await page.waitForSelector('.topbar', { timeout: 5000 }).catch(() => {});
check('yenileme sonrası oturum korunur', (await page.locator('.topbar').count()) === 1);
await page.click('[data-signout]');
await page.waitForTimeout(500);
check('çıkış → giriş ekranı', (await page.locator('form #email').count()) === 1);
check('panel konsol hatası yok', errors.length === 0, errors.join(' | '));

console.log(fail ? `\n${fail} KONTROL BAŞARISIZ` : '\nTüm canlı mod kontrolleri geçti');
await browser.close();
process.exit(fail ? 1 : 0);

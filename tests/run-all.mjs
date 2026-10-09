// Tüm doğrulama: npm test
// 1) Derler  2) Sunucuları açar (dev, sahte Supabase'li dev, statik/GitHub Pages benzeri)
// 3) Bütün test setlerini çalıştırır  4) Özet yazar  5) Sunucuları kapatır
// Ekran görüntüleri: tests/output/ (git'e eklenmez)
import { spawn, spawnSync, execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const OUT = fileURLToPath(new URL('./output/', import.meta.url));
// Testler GERÇEK veritabanına dokunmaz: ayrı bir demo derlemesi kullanılır.
const TEST_BUILD = fileURLToPath(new URL('./output/build/', import.meta.url));
const FILE = pathToFileURL(TEST_BUILD).href; // file:///…/tests/output/build/
mkdirSync(OUT, { recursive: true });
const DEMO_ENV = { ...process.env, VITE_ECHOES_TEST: 'demo' };

const only = process.argv.slice(2); // ör. npm test -- panel
const isWin = process.platform === 'win32';

// Sabit komutlar (kullanıcı girdisi yok); kabuk üzerinden tek satır olarak çalıştırılır.
function sh(command, opts = {}) {
  return spawn(command, { cwd: REPO, shell: true, stdio: 'ignore', ...opts });
}
async function waitFor(url, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      // henüz açılmadı
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Sunucu açılmadı: ${url}`);
}
function killTree(p) {
  if (!p?.pid) return;
  try {
    if (isWin) execSync(`taskkill /pid ${p.pid} /T /F`, { stdio: 'ignore' });
    else process.kill(-p.pid);
  } catch {
    // zaten kapanmış
  }
}

function buildOrExit(label, command, env = process.env) {
  console.log(`• ${label}…`);
  const r = spawnSync(command, { cwd: REPO, shell: true, encoding: 'utf8', env });
  if (r.status !== 0) {
    console.error(r.stdout, r.stderr);
    process.exit(1);
  }
}
// 1) Gerçek (yayın) derlemesi hatasız çıkmalı: kökteki index.html / admin.html
buildOrExit('Yayın derlemesi (npm run build)', 'npm run build');
// 2) Test derlemesi: demo modu, tests/output/build/ (kökteki dosyalara dokunmaz)
const testEnv = { ...DEMO_ENV, ECHOES_OUT_DIR: TEST_BUILD };
buildOrExit('Test derlemesi (demo modu)', 'npx vite build && npx vite build --config vite.admin.config.js', testEnv);

const { SAMPLE_PRODUCTS } = await import(new URL('../src/data/products.js', import.meta.url));
const CATALOG = JSON.stringify(SAMPLE_PRODUCTS);

console.log('• Sunucular açılıyor…');
const servers = [
  sh('npx vite --port 5173 --strictPort', { env: DEMO_ENV }),
  sh('npx vite --port 5174 --strictPort', {
    env: {
      ...process.env,
      VITE_ECHOES_TEST: 'mock',
      VITE_SUPABASE_URL: 'https://test-proj.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  }),
  sh('npx vite preview --port 4173 --strictPort', { env: testEnv }), // test derlemesi → statik sunucu
];
const cleanup = () => servers.forEach(killTree);
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));

try {
  await Promise.all([waitFor('http://localhost:5173/'), waitFor('http://localhost:5174/'), waitFor('http://localhost:4173/')]);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const SRV = 'http://localhost:4173/';
const suites = [
  ['Birim (fiyat, adres, doğrulama)', 'unit.mjs', {}],
  ['Sepet ve katalog mantığı', 'cart.mjs', {}],
  ['SQL şeması ve güvenlik (PGlite)', 'sql.mjs', {}],
  ['Site masaüstü — çift tıklama', 'site-e2e.mjs', { URL: `${FILE}index.html`, SHOTS: 'file' }],
  ['Site masaüstü — statik sunucu', 'site-e2e.mjs', { URL: SRV, SHOTS: 'srv' }],
  ['Site masaüstü — npm run dev', 'site-e2e.mjs', { URL: 'http://localhost:5173/', SHOTS: 'dev' }],
  ['Site mobil — çift tıklama', 'site-mobile.mjs', { URL: `${FILE}index.html` }],
  ['Ana sayfa gerileme', 'home-regress.mjs', { URL: `${FILE}index.html` }],
  ['Uç durumlar (WebGL yok, az hareket)', 'edge.mjs', { URL: `${FILE}index.html` }],
  ['Doğrudan ürün bağlantısı', 'deeplink.mjs', { BASES: `${SRV} ${FILE}index.html` }],
  ['Panel (demo) — çift tıklama', 'admin-e2e.mjs', { ROOT: FILE }],
  ['Panel (demo) — statik sunucu', 'admin-e2e.mjs', { ROOT: SRV }],
  ['Canlı mod (sahte Supabase)', 'live-e2e.mjs', { BASE: 'http://localhost:5174/' }],
].filter(([name]) => !only.length || only.some((o) => name.toLocaleLowerCase('tr').includes(o.toLocaleLowerCase('tr'))));

const rows = [];
let failed = 0;
for (const [name, file, env] of suites) {
  process.stdout.write(`• ${name}… `);
  const r = spawnSync('node', [fileURLToPath(new URL(`./${file}`, import.meta.url))], {
    cwd: OUT,
    env: { ...process.env, CATALOG, ...env },
    encoding: 'utf8',
    timeout: 15 * 60 * 1000,
  });
  const out = `${r.stdout}\n${r.stderr}`;
  const pass = (out.match(/^✓/gm) || []).length;
  const fail = (out.match(/^✗/gm) || []).length;
  const ok = r.status === 0 && fail === 0;
  if (!ok) failed++;
  rows.push({ name, pass, fail, ok });
  console.log(ok ? `${pass} geçti` : `BAŞARISIZ (${fail} kontrol)`);
  if (!ok) {
    console.log(
      out
        .split('\n')
        .filter((l) => /^✗|HATA|Error|error/.test(l))
        .slice(0, 20)
        .map((l) => `    ${l}`)
        .join('\n'),
    );
  }
}

const total = rows.reduce((n, r) => n + r.pass, 0);
console.log(`\n${failed ? `✗ ${failed} test seti başarısız` : `✓ Tüm test setleri geçti`} — toplam ${total} kontrol geçti.`);
console.log(`Ekran görüntüleri: ${OUT}`);
cleanup();
process.exit(failed ? 1 : 0);

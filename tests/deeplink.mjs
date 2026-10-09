import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let fail = 0;
for (const base of process.env.BASES.split(' ')) {
  const page = await browser.newPage();
  await page.goto(`${base}#/urun/afterglow`);
  await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 60000 });
  await page.waitForTimeout(800);
  const name = await page.locator('.pdp__name').innerText().catch(() => '(yok)');
  const ok = page.url().endsWith('#/urun/afterglow') && !page.url().includes('dist/') && name === 'Afterglow';
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} ana index.html + #/urun/afterglow → ${page.url().split('/').slice(-2).join('/')} | ürün: ${name}`);
  await page.close();
}
await browser.close();
process.exit(fail ? 1 : 0);

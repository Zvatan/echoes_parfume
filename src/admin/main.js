import { createApi, ApiError } from './api.js';
import { renderList } from './views/list.js';
import { renderEdit } from './views/edit.js';
import { renderHistory } from './views/history.js';
import { esc, toast } from './ui.js';

// ECHOES yönetim paneli
//   #/urunler      ürün listesi        #/urun/<id>   ürün düzenleme
//   #/yeni         yeni ürün           #/gecmis      değişiklik geçmişi
const app = document.getElementById('app');
const siteHref = import.meta.env.DEV ? '/' : 'index.html';

let api = null;
let session = null;
let view = null; // { isDirty?, cleanup? }
let currentHash = '';
let skipNext = false;

boot();

async function boot() {
  try {
    api = await createApi();
    session = await api.getSession();
  } catch (err) {
    app.innerHTML = `<p class="boot">Yönetim paneli başlatılamadı: ${esc(err.message)}</p>`;
    console.error('[ECHOES admin]', err);
    return;
  }
  if (session) start();
  else renderLogin();
}

function renderLogin(message = '') {
  app.innerHTML = `
    <main class="login">
      <form novalidate>
        <a class="brand" href="${siteHref}"><svg aria-hidden="true"><use href="#emblem" /></svg><span>ECHOES</span></a>
        <h1>Yönetim paneli</h1>
        ${message ? `<p class="form-error" role="alert">${esc(message)}</p>` : ''}
        <div class="field"><label for="email">E-posta</label><input class="input" id="email" type="email" autocomplete="username" required /></div>
        <div class="field"><label for="password">Şifre</label><input class="input" id="password" type="password" autocomplete="current-password" required /></div>
        <button class="btn btn--primary" type="submit">Giriş yap</button>
        <p class="login__help">supabase.com hesabınızın bilgileri değil: Supabase projenizde <strong>Authentication → Users</strong> bölümünde oluşturulan ve yönetici yapılan kullanıcının e-postası ve şifresi.</p>
      </form>
    </main>`;
  const form = app.querySelector('form');
  form.email.focus();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Giriş yapılıyor…';
    try {
      session = await api.signIn(form.email.value.trim(), form.password.value);
      start();
    } catch (err) {
      renderLogin(err instanceof ApiError ? err.message : 'Giriş yapılamadı. Lütfen tekrar deneyin.');
    }
  });
}

function start() {
  app.innerHTML = `
    <header class="topbar">
      <div class="wrap topbar__row">
        <a class="brand" href="#/urunler" aria-label="ECHOES yönetim paneli">
          <svg aria-hidden="true"><use href="#emblem" /></svg><span>ECHOES</span><small>Yönetim</small>
        </a>
        <nav class="tabs" aria-label="Panel menüsü">
          <a href="#/urunler" data-tab="urunler">Ürünler</a>
          <a href="#/gecmis" data-tab="gecmis">Değişiklik geçmişi</a>
        </nav>
        <div class="topbar__end">
          <span class="mode mode--${api.mode}">${api.mode === 'demo' ? 'Demo' : 'Canlı'}</span>
          <span class="who" title="${esc(session.email)}">${esc(session.email)}</span>
          <a class="btn btn--ghost btn--sm" href="${siteHref}" target="_blank" rel="noopener">Siteyi aç ↗</a>
          ${api.mode === 'live' ? '<button class="btn btn--ghost btn--sm" type="button" data-signout>Çıkış</button>' : ''}
        </div>
      </div>
    </header>
    ${
      api.mode === 'demo'
        ? `<div class="demo-bar" role="note"><div class="wrap">
             <p><strong>Demo modu:</strong> Supabase henüz bağlı değil. Değişiklikler yalnızca bu tarayıcıda saklanır ve yalnızca bu bilgisayarda, bu tarayıcıyla açılan siteye (<a href="${siteHref}" target="_blank" rel="noopener">Siteyi aç</a>) yansır. GitHub Pages gibi herkese açık adresteki site ve başka ziyaretçiler bu değişiklikleri <strong>göremez</strong>; bunun için Supabase bağlantısı gerekir.</p>
             <button class="btn btn--ghost btn--sm" type="button" data-reset>Demo verisini sıfırla</button>
           </div></div>`
        : ''
    }
    <main id="view"></main>`;

  app.querySelector('[data-signout]')?.addEventListener('click', async () => {
    if (view?.isDirty?.() && !confirm('Kaydedilmemiş değişiklikler var. Yine de çıkış yapılsın mı?')) return;
    await api.signOut();
    session = null;
    renderLogin();
  });
  app.querySelector('[data-reset]')?.addEventListener('click', () => {
    if (!confirm('Demo verisi silinip örnek kataloğa dönülsün mü? Bu tarayıcıdaki tüm demo değişiklikleri kaybolur.')) return;
    api.resetDemo();
    toast('Demo verisi sıfırlandı.');
    navigate('#/urunler', { force: true });
  });

  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('beforeunload', (e) => {
    if (view?.isDirty?.()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  if (!location.hash || location.hash === '#' || location.hash === '#/') history.replaceState(null, '', '#/urunler');
  route();
}

function onHashChange() {
  if (skipNext) {
    skipNext = false;
    return;
  }
  if (view?.isDirty?.() && !confirm('Kaydedilmemiş değişiklikler var. Sayfadan çıkılsın mı?')) {
    // Eski adrese dön (bu değişiklik yeniden yönlendirme tetiklemesin).
    skipNext = true;
    location.hash = currentHash;
    return;
  }
  route();
}

export function navigate(hash, { force = false } = {}) {
  if (force && view) view.isDirty = () => false;
  if (location.hash === hash) route();
  else location.hash = hash;
}

async function route() {
  view?.cleanup?.();
  view = null;
  currentHash = location.hash;
  const [, page, id] = location.hash.replace(/^#\/?/, '#/').split('/');
  const el = app.querySelector('#view');
  app.querySelectorAll('[data-tab]').forEach((a) => {
    const active = a.dataset.tab === (page === 'gecmis' ? 'gecmis' : 'urunler');
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  try {
    if (page === 'urun' && id) {
      view = await renderEdit(el, { api, id: decodeURIComponent(id), siteHref, navigate });
      document.title = 'Ürünü düzenle — ECHOES Yönetim';
    } else if (page === 'yeni') {
      view = await renderEdit(el, { api, id: null, siteHref, navigate });
      document.title = 'Yeni ürün — ECHOES Yönetim';
    } else if (page === 'gecmis') {
      await renderHistory(el, { api, session });
      document.title = 'Değişiklik geçmişi — ECHOES Yönetim';
    } else {
      await renderList(el, { api });
      document.title = 'Ürünler — ECHOES Yönetim';
    }
    window.scrollTo(0, 0);
    if (page !== 'urun' && page !== 'yeni') el.querySelector('#page-title')?.focus({ preventScroll: true });
  } catch (err) {
    console.error('[ECHOES admin]', err);
    el.innerHTML = `<section class="page wrap"><h1 class="page-title" id="page-title" tabindex="-1">Bir sorun oluştu.</h1>
      <p style="margin-top:12px">${esc(err.message || 'Veriler yüklenemedi.')}</p>
      <p style="margin-top:16px"><a class="btn btn--ghost" href="#/urunler">Ürünlere dön</a></p></section>`;
  }
}

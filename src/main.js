import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { snapshotPoses, anchorPose, CAMERA } from './scene/states.js';
import { initChoreography } from './scroll/choreography.js';
import { renderContent } from './ui/content.js';
import { createLoader } from './ui/loader.js';
import { initNav } from './ui/nav.js';
import { initCarousel } from './ui/carousel.js';
import { setImageRenderer, productImage } from './ui/images.js';
import { hideToast } from './ui/toast.js';
import { loadCatalog } from './data/catalog.js';
import { reloadCart } from './store/cart.js';
import { parseRoute } from './router.js';
import { PRODUCTS, CATEGORIES, byId } from './data/products.js';
import { categoryPage } from './pages/category.js';
import { productPage } from './pages/product.js';
import { cartPage } from './pages/cart.js';

window.__echoesStarted = true; // index.html'deki güvenlik ağına kodun çalıştığını bildirir
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowPower = matchMedia('(max-width: 760px), (pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
const html = document.documentElement;
const homeView = document.querySelector('[data-view="home"]');
const pageView = document.querySelector('[data-view="page"]');

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const ui = renderContent();
const loader = createLoader({ reducedMotion });

// --- Kaydırma -------------------------------------------------------------
let lenis = null;
if (!reducedMotion) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
html.classList.add('is-locked');

function scrollTo(target, { long = false, onComplete } = {}) {
  if (lenis) {
    lenis.scrollTo(target, { duration: long ? 2.4 : 1.5, easing: (t) => 1 - Math.pow(1 - t, 4), onComplete });
    return;
  }
  const top = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
  onComplete?.();
}

function jumpScroll(target) {
  if (lenis) {
    // Görünüm değişince sayfa yüksekliği değişir; Lenis eski sınırı önbellekte tutar.
    lenis.resize();
    lenis.scrollTo(target, { immediate: true, force: true });
  }
  else window.scrollTo(0, typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY);
  ScrollTrigger.update();
}

// --- Sahne ofsetleri: giriş animasyonu, imleç, sürükleme ---------------------
const intro = { y: 0, rx: 0, ry: 0, s: 0 };
const pointer = { x: 0, y: 0, cx: 0, cy: 0 };
const drag = { target: 0, cur: 0, active: false, startX: 0, base: 0 };

function playIntro(soft = false) {
  if (reducedMotion) return;
  const from = soft ? { y: 0.5, ry: -Math.PI, rx: 0, s: 0 } : { y: 2.8, ry: -Math.PI * 1.15, rx: -0.3, s: -0.18 };
  gsap.fromTo(intro, from, { y: 0, ry: 0, rx: 0, s: 0, duration: soft ? 2 : 2.8, ease: 'expo.out', overwrite: true });
}

// --- Sayfa durumu ---------------------------------------------------------------
let scene = null;
let choreo = null;
let route = parseRoute();
let anchorEl = null; // ürün sayfasında 3D şişenin bağlandığı kutu
let pageCleanup = null;

const nav = initNav({
  scrollTo: (target, opts) =>
    scrollTo(target, { ...opts, onComplete: opts.long && target === 0 ? () => playIntro(true) : undefined }),
  goToAnchor: (id) => (location.hash = id === 'top' ? '#/' : `#${id}`),
  isHome: () => route.name === 'home',
});
initCarousel(document.querySelector('.collection'));

boot().catch((err) => {
  // Beklenmedik bir hata olursa bile sayfa açılsın.
  console.error('[ECHOES] Başlatma hatası:', err);
  document.querySelector('.loader')?.remove();
  document.body.classList.remove('is-loading');
  document.querySelector('.nav__emblem')?.classList.add('is-ready');
  html.classList.remove('is-locked');
  lenis?.start();
});

async function boot() {
  const canvas = document.querySelector('.stage__canvas');
  // Katalog (veritabanı / demo / örnek) 3D sahneyle paralel yüklenir.
  const catalogReady = loadCatalog().then((info) => {
    reloadCart();
    return info;
  });

  try {
    if (!hasWebGL()) throw new Error('WebGL desteklenmiyor');
    // three.js ayrı bir parça olarak yüklenir; WebGL yoksa hiç indirilmez.
    const { BottleScene } = await import('./scene/BottleScene.js');
    scene = new BottleScene(canvas, { lowPower, reducedMotion });
    scene.resize();
    await scene.load((p) => loader.progress(p));

    const shots = snapshotPoses({ fov: CAMERA.fov, cameraZ: CAMERA.z });
    const thumbs = {};
    for (const key of ['whole', 'turn', 'cap', 'collar', 'label']) thumbs[key] = scene.snapshot(shots[key], { size: 240 });
    ui.setThumbs(thumbs);
    setImageRenderer((visual, size) => scene.snapshot(shots.product, { size, visual }));
  } catch (err) {
    console.warn('[ECHOES] 3D sahne yüklenemedi; görsel yedeklere geçildi.', err);
    scene?.dispose();
    scene = null;
    useFallback();
  }

  const catalog = await catalogReady;
  if (catalog.source === 'demo') showDemoFlag();
  if (scene) PRODUCTS.forEach((p) => productImage(p, 520)); // kart görselleri yükleme ekranı altında hazırlanır
  ui.renderCollection();
  await Promise.race([document.fonts.ready, wait(2500)]);

  choreo = initChoreography({ scene, ui, reducedMotion, scrollTo });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-step]');
    if (btn && route.name === 'home') choreo.goToStep(Number(btn.dataset.step));
  });
  ScrollTrigger.refresh();

  if (scene) {
    bindPointer();
    document.querySelector('.anatomy').setAttribute('data-drag-rotate', '');
    bindDrag();
    if (!reducedMotion && route.name === 'home') Object.assign(intro, { y: 2.8, ry: -Math.PI * 1.15, rx: -0.3, s: -0.18 });
  }
  gsap.ticker.add(frame);

  window.addEventListener('hashchange', () => go(parseRoute(), { fromNav: true }));
  go(route, { initial: true });

  await loader.finish(document.querySelector('.nav__emblem'));
  if (route.name === 'home') playIntro();
  html.classList.remove('is-locked');
  // Kilit kalkınca kaydırma çubuğu ve pin aralıkları değişir; konumları yeniden hesapla.
  if (route.name === 'home') ScrollTrigger.refresh();
  lenis?.start();
}

// --- Yönlendirme --------------------------------------------------------------

function buildPage(r) {
  if (r.name === 'category' && CATEGORIES[r.id]) return categoryPage(r);
  if (r.name === 'product' && byId(r.id)) return productPage(byId(r.id), { has3D: !!scene });
  if (r.name === 'cart') return cartPage();
  return {
    title: 'Sayfa bulunamadı',
    html: `<section class="page notfound container">
             <h1 class="page-title" id="page-title" tabindex="-1">Bu sayfa bulunamadı.</h1>
             <p class="page-lede">Aradığınız ürün ya da sayfa kaldırılmış olabilir.</p>
             <a class="btn btn--primary" href="#/">Ana sayfaya dönün</a>
           </section>`,
  };
}

function go(next, { initial = false } = {}) {
  hideToast();
  pageCleanup?.();
  pageCleanup = null;
  anchorEl = null;
  const wasHome = route.name === 'home';
  route = next;
  const product = route.name === 'product' ? byId(route.id) : null;
  nav.setRoute({ ...route, category: product?.category });

  if (route.name === 'home') {
    pageView.hidden = true;
    pageView.replaceChildren();
    homeView.hidden = false;
    html.dataset.route = 'home';
    html.dataset.stage = scene ? 'on' : 'off';
    document.title = 'ECHOES — Eau de Parfum';
    scene?.setModel({ model: 'amber' });
    scene?.setActive(true);
    if (!wasHome || initial) {
      jumpScroll(0);
      choreo.setEnabled(true);
      ScrollTrigger.refresh();
    }
    const target = route.anchor && route.anchor !== 'top' ? document.getElementById(route.anchor) : null;
    if (target) {
      if (!wasHome || initial) jumpScroll(target);
      else scrollTo(target);
    } else if (wasHome && !initial && route.anchor === null) {
      scrollTo(0);
    }
    if (!initial && !wasHome) enter(homeView);
    return;
  }

  // Kategori, ürün, sepet, bulunamadı
  choreo.setEnabled(false);
  homeView.hidden = true;
  const page = buildPage(route);
  pageView.innerHTML = page.html;
  pageView.hidden = false;
  html.dataset.route = route.name;
  document.title = `${page.title} — ECHOES`;
  jumpScroll(0);
  pageCleanup = page.mount?.(pageView) ?? null;

  anchorEl = scene && page.visual ? pageView.querySelector('[data-anchor]') : null;
  html.dataset.stage = anchorEl ? 'on' : 'off';
  if (anchorEl) {
    scene.setModel(page.visual);
    scene.setActive(true);
    scene.jumpTo(poseForAnchor());
    if (!initial) playIntro(true);
  } else {
    scene?.setActive(false);
  }

  if (!initial) {
    enter(pageView);
    pageView.querySelector('#page-title')?.focus({ preventScroll: true });
  }
}

// Sayfa geçişi: yeni görünüm hafifçe belirir (azaltılmış harekette anında).
function enter(view) {
  if (reducedMotion) return;
  view.classList.remove('is-entering');
  void view.offsetWidth;
  view.classList.add('is-entering');
}

function poseForAnchor() {
  const r = anchorEl.getBoundingClientRect();
  return anchorPose(r, { width: scene.size.w, height: scene.size.h, fov: CAMERA.fov, cameraZ: CAMERA.z });
}

// --- Kare döngüsü -------------------------------------------------------------

function frame(_, deltaMs) {
  let heroWeight = 0;
  if (route.name === 'home') ({ heroWeight } = choreo.evaluate());
  if (!scene) return;

  if (route.name !== 'home') {
    if (anchorEl) {
      const r = anchorEl.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < window.innerHeight;
      // Kutu ekrandan çıkınca son kare tuvalde asılı kalmasın.
      const stage = visible ? 'on' : 'off';
      if (html.dataset.stage !== stage) html.dataset.stage = stage;
      scene.setActive(visible);
      // Şişe kutusuyla birlikte gecikmesiz kayar (metnin üzerine taşmaz).
      if (visible) scene.setTarget(poseForAnchor(), { snap: true });
    } else {
      scene.setActive(false);
    }
  }

  const dt = deltaMs / 1000;
  const kp = 1 - Math.exp(-dt * 3.5);
  pointer.cx += (pointer.x * heroWeight - pointer.cx) * kp;
  pointer.cy += (pointer.y * heroWeight - pointer.cy) * kp;
  drag.cur += (drag.target - drag.cur) * (1 - Math.exp(-dt * (drag.active ? 14 : 2.2)));

  const o = scene.offset;
  const next = {
    y: intro.y,
    s: intro.s,
    rx: intro.rx + pointer.cy * 0.1,
    ry: intro.ry + pointer.cx * 0.22 + drag.cur,
  };
  const moving = Object.keys(next).some((k) => Math.abs(next[k] - o[k]) > 1e-4);
  Object.assign(o, next);
  scene.tick(moving);
}

function bindPointer() {
  if (!matchMedia('(pointer: fine)').matches || reducedMotion) return;
  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true },
  );
}

// [data-drag-rotate] alanlarında (ana sayfadaki şişe bölümü, ürün sayfasındaki 3D görsel)
// şişeyi yatay sürükleyerek çevirme; bırakınca yerine döner.
function bindDrag() {
  let surface = null;
  document.addEventListener('pointerdown', (e) => {
    surface = e.target.closest('[data-drag-rotate]');
    if (!surface || e.button !== 0 || e.target.closest('a, button')) return (surface = null);
    drag.active = true;
    drag.startX = e.clientX;
    drag.base = drag.target;
    surface.classList.add('is-grabbing');
  });
  window.addEventListener('pointermove', (e) => {
    if (drag.active) drag.target = drag.base + (e.clientX - drag.startX) * 0.012;
  });
  const end = () => {
    if (!drag.active) return;
    drag.active = false;
    drag.target = 0;
    surface?.classList.remove('is-grabbing');
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
}

// Yönetim paneli demo modunda kullanıldıysa site bu tarayıcıda demo verisini gösterir;
// bunun gerçek (herkese açık) katalog olmadığı açıkça belirtilir.
function showDemoFlag() {
  const adminHref = import.meta.env.DEV ? '/admin/' : 'admin.html';
  const el = document.createElement('p');
  el.className = 'demo-flag';
  el.innerHTML = `Bu tarayıcıda yönetim panelinin <strong>demo</strong> kataloğu gösteriliyor. <a href="${adminHref}">Panele git</a>`;
  document.body.append(el);
}

function useFallback() {
  html.classList.add('no-webgl');
  document.querySelector('.stage')?.remove();
  document.querySelectorAll('.stage-fallback').forEach((el) => (el.hidden = false));
}

function hasWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

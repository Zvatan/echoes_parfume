import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { snapshotPoses, CAMERA } from './scene/states.js';
import { initChoreography } from './scroll/choreography.js';
import { renderContent } from './ui/content.js';
import { createLoader } from './ui/loader.js';
import { initNav } from './ui/nav.js';
import { initCarousel } from './ui/carousel.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowPower = matchMedia('(max-width: 760px), (pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;

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
document.documentElement.classList.add('is-locked');

function scrollTo(target, { long = false, onComplete } = {}) {
  if (lenis) {
    lenis.scrollTo(target, { duration: long ? 2.4 : 1.5, easing: (t) => 1 - Math.pow(1 - t, 4), onComplete });
    return;
  }
  const top = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
  onComplete?.();
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

initNav({
  scrollTo: (target, opts) =>
    scrollTo(target, { ...opts, onComplete: opts.long && target === 0 ? () => playIntro(true) : undefined }),
});
initCarousel(document.querySelector('.profile'));

boot();

async function boot() {
  const canvas = document.querySelector('.stage__canvas');
  let scene = null;

  try {
    if (!hasWebGL()) throw new Error('WebGL desteklenmiyor');
    // three.js ayrı bir parça olarak yüklenir; WebGL yoksa hiç indirilmez.
    const { BottleScene } = await import('./scene/BottleScene.js');
    scene = new BottleScene(canvas, { lowPower, reducedMotion });
    scene.resize();
    await scene.load((p) => loader.progress(p));

    const shots = snapshotPoses({ fov: CAMERA.fov, cameraZ: CAMERA.z });
    const thumbs = {};
    for (const [key, pose] of Object.entries(shots)) thumbs[key] = scene.snapshot(pose, { size: 240 });
    ui.setThumbs(thumbs);
    ui.setCardVisual(scene.snapshot(shots.whole, { size: 720, dark: true }), 'ECHOES parfüm şişesi');
  } catch (err) {
    console.warn('[ECHOES] 3D sahne yüklenemedi; etiket görseline geçildi.', err);
    scene?.dispose();
    scene = null;
    useFallback();
  }

  await Promise.race([document.fonts.ready, wait(2500)]);

  const choreo = initChoreography({ scene, ui, reducedMotion, scrollTo });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-step]');
    if (btn) choreo.goToStep(Number(btn.dataset.step));
  });
  ScrollTrigger.refresh();

  if (scene) {
    bindPointer();
    bindDrag(document.querySelector('.anatomy'));
    if (!reducedMotion) Object.assign(intro, { y: 2.8, ry: -Math.PI * 1.15, rx: -0.3, s: -0.18 });

    gsap.ticker.add((_, deltaMs) => {
      const { heroWeight } = choreo.evaluate();
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
    });
  } else {
    gsap.ticker.add(() => choreo.evaluate());
  }

  await loader.finish(document.querySelector('.nav__emblem'));
  playIntro();
  document.documentElement.classList.remove('is-locked');
  // Kilit kalkınca kaydırma çubuğu ve pin aralıkları değişir; konumları yeniden hesapla.
  ScrollTrigger.refresh();
  lenis?.start();
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

// Ürün bölümünde şişeyi yatay sürükleyerek çevirme; bırakınca yerine döner.
function bindDrag(section) {
  section.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('a, button')) return;
    drag.active = true;
    drag.startX = e.clientX;
    drag.base = drag.target;
    section.classList.add('is-grabbing');
  });
  window.addEventListener('pointermove', (e) => {
    if (drag.active) drag.target = drag.base + (e.clientX - drag.startX) * 0.012;
  });
  const end = () => {
    if (!drag.active) return;
    drag.active = false;
    drag.target = 0;
    section.classList.remove('is-grabbing');
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
}

function useFallback() {
  document.documentElement.classList.add('no-webgl');
  document.querySelector('.stage')?.remove();
  document.querySelectorAll('.stage-fallback').forEach((el) => (el.hidden = false));
  ui.setCardVisual('/images/echoes_label_texture.png', 'ECHOES etiketi');
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

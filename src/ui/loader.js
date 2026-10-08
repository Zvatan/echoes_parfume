import gsap from 'gsap';

// Yükleme ekranı: amblemin dış halkası gerçek yükleme ilerlemesiyle çizilir,
// bitince amblem menüdeki logonun yerine uçar ve perde yukarı açılır.
export function createLoader({ reducedMotion }) {
  const el = document.querySelector('.loader');
  const count = el.querySelector('[data-count]');
  const emblem = el.querySelector('.loader__emblem');
  const outer = emblem.querySelector('.em-outer');
  const state = { p: 0 };
  let reported = 0;

  const render = () => {
    count.textContent = Math.round(state.p * 100);
    outer.style.strokeDashoffset = String(1 - state.p);
  };
  const tweenTo = (p, duration) => gsap.to(state, { p, duration, ease: 'power2.out', onUpdate: render, overwrite: true });

  // Model indirilmeden önce de hafif bir ilerleme göster.
  tweenTo(0.12, 1.2);

  return {
    progress(p) {
      reported = Math.max(reported, 0.12 + p * 0.78);
      tweenTo(reported, 0.5);
    },

    async finish(navEmblem) {
      await tweenTo(1, reducedMotion ? 0.1 : 0.55);

      if (reducedMotion) {
        document.body.classList.remove('is-loading');
        navEmblem.classList.add('is-ready');
        await gsap.to(el, { autoAlpha: 0, duration: 0.3 });
        el.remove();
        return;
      }

      const from = emblem.getBoundingClientRect();
      const to = navEmblem.getBoundingClientRect();
      const tl = gsap.timeline();
      tl.to('.loader__meta', { autoAlpha: 0, y: -12, duration: 0.45, ease: 'power2.in' }, 0)
        .to(
          emblem,
          {
            x: to.left + to.width / 2 - (from.left + from.width / 2),
            y: to.top + to.height / 2 - (from.top + from.height / 2),
            scale: to.width / from.width,
            duration: 1.15,
            ease: 'expo.inOut',
          },
          0.15,
        )
        .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.2, ease: 'expo.inOut' }, 0.35)
        .add(() => document.body.classList.remove('is-loading'), 0.55)
        .add(() => navEmblem.classList.add('is-ready'), 1.25)
        .add(() => el.remove());
      // Perde açılmaya başladığında sahnenin girişi de başlasın.
      await new Promise((r) => tl.call(r, null, 0.5));
    },
  };
}

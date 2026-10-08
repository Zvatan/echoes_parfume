// Menü: mobil aç/kapa, kaydırınca ince çizgi, sayfa içi bağlantılar.
export function initNav({ scrollTo }) {
  const nav = document.querySelector('[data-nav]');
  const toggle = nav.querySelector('.nav__toggle');

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
  };
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = id === 'top' ? 0 : document.getElementById(id);
    if (target === null) return;
    e.preventDefault();
    setOpen(false);
    scrollTo(target, { long: a.hasAttribute('data-to-top') });
    if (target !== 0) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });

  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

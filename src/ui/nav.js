import { getCart, onCartChange } from '../store/cart.js';

// Menü: mobil aç/kapa, kaydırınca ince çizgi, sepet sayacı ve sayfa içi bağlantılar.
// Sayfa bağlantıları (#/kadin, #/urun/...) yönlendiriciye bırakılır; bölüm bağlantıları
// (#hikaye, #koleksiyon...) ana sayfadaysa yumuşak kaydırılır, değilse önce ana sayfaya dönülür.
export function initNav({ scrollTo, goToAnchor, isHome }) {
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
    setOpen(false);
    const id = a.getAttribute('href').slice(1);
    if (id.startsWith('/')) return; // sayfa bağlantısı: hashchange ile yönlendirici çalışır
    e.preventDefault();
    if (!isHome()) {
      goToAnchor(id);
      return;
    }
    const target = id === 'top' ? 0 : document.getElementById(id);
    if (target === null) return;
    scrollTo(target, { long: a.hasAttribute('data-to-top') });
    if (target !== 0) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });

  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Sepet sayacı
  const cartLink = nav.querySelector('.nav__cart');
  const badge = nav.querySelector('[data-cart-count]');
  const renderCount = ({ count }) => {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = count === 0;
    cartLink.setAttribute('aria-label', count ? `Sepet, ${count} ürün` : 'Sepet, boş');
    badge.classList.remove('is-bumped');
    void badge.offsetWidth;
    if (count) badge.classList.add('is-bumped');
  };
  renderCount(getCart());
  onCartChange(renderCount);

  return {
    // Aktif sayfayı menüde işaretle.
    setRoute(route) {
      const key = route.name === 'category' ? route.id : route.name === 'cart' ? 'sepet' : route.name === 'product' ? route.category : '';
      nav.querySelectorAll('[data-nav-route]').forEach((el) => {
        if (el.dataset.navRoute === key) el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
      });
    },
  };
}

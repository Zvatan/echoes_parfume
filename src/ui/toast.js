// Kısa geri bildirim mesajı (ekran okuyuculara da duyurulur).
let el = null;
let timer = 0;

// Sayfa değişince eski bildirim yeni sayfada kalmasın.
export function hideToast() {
  clearTimeout(timer);
  el?.classList.remove('is-visible');
}

export function showToast(html, { duration = 4200 } = {}) {
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.innerHTML = `<div class="toast__inner">${html}</div>`;
  el.classList.remove('is-visible');
  void el.offsetWidth; // animasyonu yeniden başlat
  el.classList.add('is-visible');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('is-visible'), duration);
}

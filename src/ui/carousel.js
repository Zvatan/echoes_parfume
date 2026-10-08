// Yatay kart rafı: yerel kaydırma + scroll-snap; oklar ve fareyle sürükleme.
export function initCarousel(section) {
  const track = section.querySelector('[data-track]');
  const prev = section.querySelector('[data-prev]');
  const next = section.querySelector('[data-next]');

  const step = () => {
    const card = track.querySelector('.card');
    return card ? card.getBoundingClientRect().width + 20 : track.clientWidth * 0.8;
  };
  const update = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
  };

  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();

  // Fareyle sürükleme (dokunmatikte yerel kaydırma zaten var).
  let startX = 0;
  let startLeft = 0;
  let dragging = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    startLeft = track.scrollLeft;
    track.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    track.scrollLeft = startLeft - (e.clientX - startX);
  });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
  });
}

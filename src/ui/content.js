import { story, anatomy, profile, contact } from '../content.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// content.js'teki verileri DOM'a yazar ve bölümlerin durumunu değiştiren yardımcıları döndürür.
export function renderContent() {
  // Parça rafı
  const partsRow = $('[data-parts]');
  partsRow.innerHTML = anatomy
    .map(
      (a, i) => `
      <li>
        <button class="part" type="button" data-step="${i}">
          <span class="part__thumb" data-thumb="${a.focus}"></span>
          <span class="part__label">${esc(a.eyebrow)}</span>
        </button>
      </li>`,
    )
    .join('');

  // Hikâye
  const storyList = $('[data-story]');
  storyList.innerHTML = story
    .map(
      (c) => `
      <li class="chapter">
        <span class="chapter__no">[${esc(c.no)}]</span>
        <h3 class="chapter__title">${esc(c.title)}</h3>
        <p class="chapter__text">${esc(c.text)}</p>
      </li>`,
    )
    .join('');
  const chapters = [...storyList.children];

  // Ürün adımları
  const captions = $('[data-captions]');
  captions.innerHTML = anatomy
    .map(
      (a) => `
      <article class="caption">
        <p class="eyebrow">${esc(a.eyebrow)}</p>
        <h3 class="caption__title">${esc(a.title)}</h3>
        <p class="caption__text">${esc(a.text)}</p>
      </article>`,
    )
    .join('');
  const captionEls = [...captions.children];

  const index = $('[data-index]');
  index.innerHTML = anatomy
    .map(
      (a, i) => `<li><button type="button" data-step="${i}" aria-label="${esc(a.eyebrow)}"><span>${String(i + 1).padStart(2, '0')}</span></button></li>`,
    )
    .join('');
  const indexBtns = [...index.querySelectorAll('button')];

  // Koku profili kartları
  $('[data-cards]').innerHTML = profile.map(cardTemplate).join('');

  // Footer
  $('[data-contact]').innerHTML = contact.email
    ? `<li><a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></li>`
    : '<li class="muted">İletişim bilgileri yakında.</li>';
  const socials = contact.social.filter((s) => s.url);
  $('[data-social]').innerHTML = socials.length
    ? socials.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} <span aria-hidden="true">↗</span></a></li>`).join('')
    : '<li class="muted">Hesaplar yakında.</li>';
  $('[data-year]').textContent = new Date().getFullYear();

  return {
    storyCount: story.length,
    anatomySteps: anatomy.map((a) => a.focus),
    setChapter(i) {
      chapters.forEach((el, j) => el.classList.toggle('is-active', j === i));
      storyList.style.setProperty('--progress', (i + 1) / chapters.length);
    },
    setStep(i) {
      captionEls.forEach((el, j) => {
        el.classList.toggle('is-active', j === i);
        el.setAttribute('aria-hidden', j === i ? 'false' : 'true');
      });
      indexBtns.forEach((el, j) => el.toggleAttribute('aria-current', j === i));
    },
    setThumbs(urls) {
      document.querySelectorAll('[data-thumb]').forEach((el) => {
        const url = urls[el.dataset.thumb];
        if (url) el.innerHTML = `<img src="${url}" alt="" width="160" height="160" />`;
      });
    },
    setCardVisual(url, alt) {
      document.querySelectorAll('[data-visual="bottle"]').forEach((el) => {
        el.innerHTML = `<img src="${url}" alt="${esc(alt)}" />`;
      });
    },
  };
}

function cardTemplate(c) {
  const notes = c.notes ? `<ul class="card__notes">${c.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
  const meter = c.meter != null
    ? `<div class="card__meter" role="img" aria-label="Yoğunluk: ${Math.round(c.meter * 100)} / 100"><span style="--v:${c.meter}"></span></div>`
    : '';
  const visual = c.visual ? `<div class="card__visual" data-visual="${c.visual}"></div>` : '';
  const sample = c.sample ? '<span class="card__sample">Örnek içerik</span>' : '';
  return `
    <li class="card card--${c.tone}">
      <p class="eyebrow">${esc(c.eyebrow)}</p>
      <h3 class="card__title">${esc(c.title)}</h3>
      <p class="card__text">${esc(c.text)}</p>
      ${notes}${meter}${visual}${sample}
    </li>`;
}

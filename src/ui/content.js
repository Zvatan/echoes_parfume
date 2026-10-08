import { story, anatomy, contact } from '../content.js';
import { PRODUCTS, CATEGORIES, byCategory } from '../data/products.js';
import { href } from '../router.js';
import { productCard, esc } from './components.js';
import { productImage } from './images.js';

const $ = (sel, root = document) => root.querySelector(sel);

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
    // Ana sayfa koleksiyonu: tüm ürünler (kadın/erkek sırayla) + iki kategori girişi.
    // Ürün görselleri 3D sahne hazır olduktan sonra üretildiği için ayrı çağrılır.
    renderCollection() {
      const women = byCategory('kadin');
      const men = byCategory('erkek');
      const mixed = [];
      for (let i = 0; i < Math.max(women.length, men.length); i++) mixed.push(women[i], men[i]);
      $('[data-collection]').innerHTML = mixed.filter(Boolean).map((p) => productCard(p)).join('');

      $('[data-cat-tiles]').innerHTML = Object.values(CATEGORIES)
        .map((c) => {
          const lead = PRODUCTS.find((p) => p.category === c.id && !p.visual.placeholder) ?? byCategory(c.id)[0];
          return `
            <li class="cat-tile cat-tile--${c.id}">
              <a href="${href.category(c.id)}">
                <div class="cat-tile__text">
                  <p class="eyebrow">${byCategory(c.id).length} parfüm</p>
                  <h3 class="cat-tile__title">${esc(c.title)}</h3>
                  <p class="cat-tile__intro">${esc(c.intro)}</p>
                  <span class="cat-tile__cta">Keşfedin <span aria-hidden="true">→</span></span>
                </div>
                <img src="${productImage(lead, 520)}" alt="" width="520" height="520" loading="lazy" />
              </a>
            </li>`;
        })
        .join('');
    },
  };
}

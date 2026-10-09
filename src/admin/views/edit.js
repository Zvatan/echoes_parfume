import { parsePriceToKurus, formatKurus, slugify, rowToProduct } from '../../data/mapping.js';
import { validateProduct, LIMITS } from '../../data/validate.js';
import { silhouette } from '../../ui/images.js';
import { ApiError } from '../api.js';
import { esc, toast, STATUS, MODELS, formatDate, chipsInput } from '../ui.js';

const BLANK = {
  name: '',
  slug: '',
  category_id: '',
  status: 'draft',
  price_kurus: null,
  currency: 'TRY',
  volume_ml: 50,
  concentration: 'Eau de Parfum',
  short_description: '',
  description: '',
  notes_top: [],
  notes_heart: [],
  notes_base: [],
  character: '',
  longevity: '',
  usage: '',
  stock: 0,
  visual: { model: 'amber', placeholder: true },
  image_path: null,
  is_sample: true,
};

const DEFAULT_TINT = { amber: { glass: '#be9158', liquid: '#ab6c2b' }, clear: { glass: '#eaf2f8', liquid: '#e0d6b8' } };

// Dönüş: { isDirty() } — kabuk, sayfadan çıkarken kaydedilmemiş değişiklik uyarısı için kullanır.
export async function renderEdit(el, { api, id, siteHref, navigate }) {
  el.innerHTML = '<p class="boot">Ürün yükleniyor…</p>';
  const [categories, all, found] = await Promise.all([api.listCategories(), api.listProducts(), id ? api.getProduct(id) : null]);
  if (id && !found) {
    el.innerHTML = `<section class="page wrap"><h1 class="page-title" tabindex="-1" id="page-title">Ürün bulunamadı.</h1>
      <p style="margin-top:12px"><a class="btn btn--ghost" href="#/urunler">Ürünlere dön</a></p></section>`;
    return { isDirty: () => false };
  }

  const isNew = !found;
  const original = structuredClone(found ?? { ...BLANK, category_id: categories[0]?.id ?? '' });
  let row = structuredClone(original);
  let slugTouched = !isNew;
  let priceText = row.price_kurus == null ? '' : formatKurus(row.price_kurus);
  let errors = {};
  let saving = false;

  const field = (name, label, control, { hint = '', count = 0, cls = '' } = {}) => `
    <div class="field ${cls}" data-field="${name}">
      <label for="f-${name}">${label}</label>
      ${control}
      ${count ? `<span class="count" data-count="${name}"></span>` : ''}
      ${hint ? `<span class="hint">${hint}</span>` : ''}
      <span class="error" data-error="${name}" id="e-${name}" hidden></span>
    </div>`;
  const input = (name, attrs = '') =>
    `<input class="input" id="f-${name}" name="${name}" aria-describedby="e-${name}" ${attrs} />`;

  el.innerHTML = `
    <form class="page wrap" novalidate aria-labelledby="page-title">
      <nav class="crumbs" aria-label="Konum"><a href="#/urunler">Ürünler</a><span aria-hidden="true">/</span><span aria-current="page">${isNew ? 'Yeni ürün' : esc(original.name)}</span></nav>
      <div class="page-head">
        <h1 class="page-title" id="page-title" tabindex="-1">${isNew ? 'Yeni ürün.' : `${esc(original.name)}<span>.</span>`}</h1>
        <a class="btn btn--ghost btn--sm" data-view-site target="_blank" rel="noopener" hidden>Sitede görüntüle ↗</a>
      </div>
      <div class="errors" data-errors role="alert" hidden></div>
      <div class="notice" data-visibility role="status" hidden>
        <p data-visibility-text></p>
        <button type="button" class="btn btn--primary btn--sm" data-publish>Yayınla ve kaydet</button>
      </div>

      <div class="form-grid">
        <div>
          <section class="panel" aria-labelledby="h-basic">
            <h2 id="h-basic">Temel bilgiler</h2>
            <div class="grid">
              ${field('name', 'Ürün adı *', input('name', `maxlength="${LIMITS.name}" autocomplete="off" required`), { cls: 'full' })}
              ${field('slug', 'Adres *', input('slug', `maxlength="${LIMITS.slug}" autocomplete="off" spellcheck="false" required`), {
                hint: isNew ? 'Addan otomatik oluşur. Sitede: #/urun/<adres>' : 'Yayındaki bir ürünün adresini değiştirmek paylaşılmış bağlantıları bozar.',
              })}
              ${field(
                'category_id',
                'Kategori *',
                `<select class="select" id="f-category_id" name="category_id" aria-describedby="e-category_id">
                  ${categories.map((c) => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join('')}
                </select>`,
              )}
              ${field('concentration', 'Yoğunluk', input('concentration', `maxlength="${LIMITS.concentration}" list="conc-list"`))}
              <datalist id="conc-list"><option>Eau de Parfum</option><option>Eau de Toilette</option><option>Extrait de Parfum</option><option>Parfum</option></datalist>
            </div>
          </section>

          <section class="panel" aria-labelledby="h-price">
            <h2 id="h-price">Fiyat ve stok</h2>
            <div class="grid grid--3">
              ${field('price_kurus', 'Fiyat *', `<div class="prefix"><span>₺</span>${input('price_kurus', 'inputmode="decimal" autocomplete="off" placeholder="2.850"')}</div>`, { hint: 'Örn. 2.850 veya 2.850,50' })}
              ${field('volume_ml', 'Hacim *', `<div class="suffix">${input('volume_ml', 'type="number" min="1" max="1000" step="1" inputmode="numeric"')}<span>ml</span></div>`)}
              ${field('stock', 'Stok *', input('stock', `type="number" min="0" max="${LIMITS.stockMax}" step="1" inputmode="numeric"`), { hint: 'Sitede satılabilecek en fazla adet.' })}
            </div>
          </section>

          <section class="panel" aria-labelledby="h-text">
            <h2 id="h-text">Açıklamalar</h2>
            <div class="grid">
              ${field('short_description', 'Kısa açıklama', input('short_description', `maxlength="${LIMITS.short_description + 40}"`), {
                cls: 'full',
                count: LIMITS.short_description,
                hint: 'Ürün kartlarında ve ürün başlığının altında görünür. Yayınlamak için gerekli.',
              })}
              ${field('description', 'Açıklama', `<textarea class="textarea" id="f-description" name="description" rows="5" aria-describedby="e-description"></textarea>`, {
                cls: 'full',
                count: LIMITS.description,
              })}
            </div>
          </section>

          <section class="panel" aria-labelledby="h-scent">
            <h2 id="h-scent">Koku profili</h2>
            <div class="grid">
              ${field('character', 'Koku karakteri', input('character', `maxlength="${LIMITS.character}" placeholder="Amber · Baharatlı"`))}
              ${field('longevity', 'Kalıcılık', input('longevity', `maxlength="${LIMITS.longevity}" placeholder="Uzun kalıcı (8+ saat)"`))}
              ${field('usage', 'Kullanım', input('usage', `maxlength="${LIMITS.usage}"`), { cls: 'full' })}
              ${['notes_top', 'notes_heart', 'notes_base']
                .map(
                  (n, i) => `
                <div class="field full" data-field="${n}">
                  <span class="label" id="l-${n}">${['Üst notalar', 'Kalp notaları', 'Dip notaları'][i]}</span>
                  <div class="chips" data-chips="${n}" role="group" aria-labelledby="l-${n}"></div>
                  <span class="hint">En fazla ${LIMITS.notes} nota. Enter veya virgülle ekleyin.</span>
                  <span class="error" data-error="${n}" hidden></span>
                </div>`,
                )
                .join('')}
            </div>
          </section>

          <section class="panel" aria-labelledby="h-visual">
            <h2 id="h-visual">Görsel</h2>
            <div class="grid">
              ${field(
                'model',
                '3D şişe',
                `<select class="select" id="f-model" aria-describedby="e-visual">
                  ${Object.entries(MODELS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}
                </select>`,
                { hint: 'Fotoğraf yüklenmemişse ürün görseli bu şişeden üretilir.' },
              )}
              <div class="field">
                <span class="label">Tonlar</span>
                <div class="colors">
                  <label class="color"><span><input type="checkbox" data-tint-on="glass" /> Cam</span><input type="color" data-tint="glass" aria-label="Cam tonu" /></label>
                  <label class="color"><span><input type="checkbox" data-tint-on="liquid" /> Sıvı</span><input type="color" data-tint="liquid" aria-label="Sıvı tonu" /></label>
                </div>
                <span class="hint">İşaretli değilse modelin kendi rengi kullanılır.</span>
              </div>
              <label class="check full"><input type="checkbox" data-placeholder /> <span>Bu şişe ürünün kendi şişesi değil — sitede “Geçici ürün görseli” yazsın.</span></label>
              <div class="field full" data-field="visual"><span class="error" data-error="visual" id="e-visual" hidden></span></div>
            </div>
          </section>
        </div>

        <aside class="side">
          <section class="panel" aria-labelledby="h-status">
            <h2 id="h-status">Durum</h2>
            <div class="seg" role="radiogroup" aria-labelledby="h-status">
              ${Object.entries(STATUS)
                .map(([k, v]) => `<label><input type="radio" name="status" value="${k}" /><span>${v}</span></label>`)
                .join('')}
            </div>
            <p class="hint" data-status-hint style="margin-top:10px;font-size:12px;color:var(--ink-2)"></p>
            <label class="check" style="margin-top:14px"><input type="checkbox" name="is_sample" /> <span>Örnek veri — sitede “örnek veri” notu gösterilir.</span></label>
          </section>

          <section class="panel" aria-labelledby="h-photo">
            <h2 id="h-photo">Önizleme</h2>
            <div class="preview"><img data-preview alt="Ürün görseli önizlemesi" /></div>
            <label class="drop" data-drop>
              <input type="file" accept="image/jpeg,image/png,image/webp" data-file hidden />
              <strong>Fotoğraf yükle</strong>
              <span>JPG, PNG veya WEBP · en fazla 5 MB · sürükleyip bırakabilirsiniz</span>
            </label>
            <button type="button" class="btn btn--link" data-remove-photo hidden>Fotoğrafı kaldır</button>
            <span class="error" data-error="image_path" hidden></span>
            <dl class="meta" data-meta></dl>
          </section>

          ${
            isNew
              ? ''
              : `<section class="panel" aria-labelledby="h-danger">
                   <h2 id="h-danger">Kalıcı silme</h2>
                   <p class="hint" style="font-size:13px;color:var(--ink-2);margin-bottom:12px">Ürünü sitede gizlemek için durumunu “Arşivde” yapın. Silme geri alınamaz ve yalnızca “owner” yetkisiyle yapılabilir.</p>
                   <button type="button" class="btn btn--danger btn--sm" data-delete>Ürünü sil</button>
                 </section>`
          }
        </aside>
      </div>

      <div class="savebar">
        <div class="wrap">
          <p class="savebar__status" data-dirty>${isNew ? 'Yeni ürün henüz kaydedilmedi.' : 'Tüm değişiklikler kayıtlı.'}</p>
          <a class="btn btn--ghost savebar__back" href="#/urunler">Ürünlere dön</a>
          <button type="button" class="btn btn--ghost" data-revert disabled>Değişiklikleri geri al</button>
          <button type="submit" class="btn btn--primary" data-save>Kaydet</button>
        </div>
      </div>
    </form>`;

  const form = el.querySelector('form');
  const $ = (s) => el.querySelector(s);

  // --- Formu satırdan doldur ---
  const fill = () => {
    for (const k of ['name', 'slug', 'concentration', 'short_description', 'description', 'character', 'longevity', 'usage']) {
      form.elements[k].value = row[k] ?? '';
    }
    form.elements.category_id.value = row.category_id;
    form.elements.price_kurus.value = priceText;
    form.elements.volume_ml.value = row.volume_ml ?? '';
    form.elements.stock.value = row.stock ?? '';
    form.elements.is_sample.checked = row.is_sample;
    for (const r of form.querySelectorAll('[name="status"]')) r.checked = r.value === row.status;
    $('#f-model').value = row.visual.model ?? '';
    $('[data-placeholder]').checked = row.visual.placeholder !== false;
    for (const t of ['glass', 'liquid']) {
      $(`[data-tint-on="${t}"]`).checked = Boolean(row.visual[t]);
      $(`[data-tint="${t}"]`).value = row.visual[t] ?? DEFAULT_TINT[row.visual.model || 'amber'][t];
    }
    for (const n of ['notes_top', 'notes_heart', 'notes_base']) {
      // Her doldurmada temiz bir kapsayıcı (eski olay dinleyicileri kalmasın).
      const old = $(`[data-chips="${n}"]`);
      const fresh = old.cloneNode(false);
      old.replaceWith(fresh);
      chipsInput(fresh, {
        values: row[n],
        max: LIMITS.notes,
        maxLen: LIMITS.note,
        label: { notes_top: 'Üst notalar', notes_heart: 'Kalp notaları', notes_base: 'Dip notaları' }[n],
        onChange: (v) => {
          row[n] = v;
          changed(n);
        },
      });
    }
  };

  // --- Formdan satıra ---
  const intOrNull = (v) => (v === '' || v == null ? null : Number(v));
  const read = (name) => {
    const v = form.elements[name]?.value;
    if (['name', 'concentration', 'short_description', 'description', 'character', 'longevity', 'usage'].includes(name)) row[name] = v;
    if (name === 'slug') row.slug = v.trim();
    if (name === 'category_id') row.category_id = v;
    if (name === 'price_kurus') {
      priceText = v;
      row.price_kurus = parsePriceToKurus(v);
    }
    if (name === 'volume_ml' || name === 'stock') row[name] = intOrNull(v);
    if (name === 'is_sample') row.is_sample = form.elements.is_sample.checked;
    if (name === 'status') row.status = form.querySelector('[name="status"]:checked').value;
  };

  const readVisual = () => {
    const model = $('#f-model').value || null;
    const v = { model, placeholder: $('[data-placeholder]').checked };
    for (const t of ['glass', 'liquid']) if ($(`[data-tint-on="${t}"]`).checked) v[t] = $(`[data-tint="${t}"]`).value;
    row.visual = v;
  };

  // --- Durum göstergeleri ---
  // Anahtar sırasından bağımsız karşılaştırma (aynı veri farklı sırayla "değişmiş" sayılmasın).
  const stable = (v) =>
    Array.isArray(v)
      ? v.map(stable)
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => [k, stable(v[k])]))
        : v;
  const comparable = (r) => JSON.stringify(stable({ ...r, updated_at: null, created_at: null, updated_by: null }));
  const isDirty = () => comparable(row) !== comparable(original);

  const updatePreview = () => {
    const url = row.image_path ? api.imageUrl(row.image_path) : silhouette(rowToProduct({ ...row, slug: row.slug || 'yeni', price_kurus: row.price_kurus ?? 0 }));
    $('[data-preview]').src = url;
    $('[data-remove-photo]').hidden = !row.image_path;
    const link = $('[data-view-site]');
    link.hidden = isNew || original.status !== 'published';
    link.href = `${siteHref}#/urun/${encodeURIComponent(original.slug)}`;
  };

  const updateCounts = () => {
    for (const [name, max] of [['short_description', LIMITS.short_description], ['description', LIMITS.description]]) {
      const n = String(row[name] ?? '').length;
      const c = $(`[data-count="${name}"]`);
      c.textContent = `${n} / ${max}`;
      c.classList.toggle('is-over', n > max);
    }
  };

  const statusHint = () => {
    $('[data-status-hint]').textContent = {
      published: 'Sitede görünür ve satılabilir.',
      draft: 'Sitede görünmez. Hazır olunca “Yayında” yapın.',
      archived: 'Sitede görünmez; listede “Arşivde” filtresiyle bulunur.',
    }[row.status];
    // Ürün sitede görünmeyecekse bunu formun en üstünde açıkça söyle.
    const hidden = row.status !== 'published';
    $('[data-visibility]').hidden = !hidden;
    if (hidden) {
      $('[data-visibility-text]').innerHTML =
        row.status === 'draft'
          ? '<strong>Bu ürün sitede görünmüyor:</strong> durumu “Taslak”. Ziyaretçilerin görmesi için yayınlayın.'
          : '<strong>Bu ürün sitede görünmüyor:</strong> durumu “Arşivde”. Tekrar satışa açmak için yayınlayın.';
    }
  };

  const updateDirty = () => {
    const dirty = isDirty();
    const s = $('[data-dirty]');
    s.textContent = dirty ? 'Kaydedilmemiş değişiklikler var.' : isNew ? 'Yeni ürün henüz kaydedilmedi.' : 'Tüm değişiklikler kayıtlı.';
    s.classList.toggle('is-dirty', dirty);
    $('[data-revert]').disabled = !dirty;
  };

  const showErrors = (errs, { focus = false } = {}) => {
    errors = errs;
    el.querySelectorAll('[data-error]').forEach((e) => {
      const msg = errs[e.dataset.error];
      e.textContent = msg ?? '';
      e.hidden = !msg;
      e.closest('.field')?.classList.toggle('has-error', Boolean(msg));
      const ctl = el.querySelector(`#f-${e.dataset.error}`);
      if (ctl) ctl.setAttribute('aria-invalid', msg ? 'true' : 'false');
    });
    const box = $('[data-errors]');
    const keys = Object.keys(errs);
    box.hidden = !keys.length;
    if (keys.length) {
      const labelOf = (k) => el.querySelector(`[data-field="${k}"] label, [data-field="${k}"] .label`)?.textContent.replace(' *', '') ?? 'Görsel';
      box.innerHTML = `<strong>Kaydetmeden önce ${keys.length} alanı düzeltin:</strong><ul>${keys
        .map((k) => `<li><a href="#" data-goto="${k}">${esc(labelOf(k))}</a>: ${esc(errs[k])}</li>`)
        .join('')}</ul>`;
      if (focus) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const otherSlugs = new Set(all.filter((p) => p.id !== original.id).map((p) => p.slug));
  const check = () =>
    validateProduct(row, { categories: categories.map((c) => c.id), slugTaken: (s) => otherSlugs.has(s) });

  function changed(name) {
    if (name === 'name' && !slugTouched) {
      row.slug = slugify(row.name);
      form.elements.slug.value = row.slug;
    }
    if (name === 'model') {
      for (const t of ['glass', 'liquid']) {
        if (!$(`[data-tint-on="${t}"]`).checked) $(`[data-tint="${t}"]`).value = DEFAULT_TINT[row.visual.model || 'amber'][t];
      }
    }
    // Hata gösterildiyse, kullanıcı düzelttikçe güncelle.
    if (Object.keys(errors).length) showErrors(check());
    updateCounts();
    updatePreview();
    statusHint();
    updateDirty();
  }

  // --- Olaylar ---
  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.name === 'slug') slugTouched = true;
    if (t.name && form.elements[t.name] && !t.closest('.chips')) {
      read(t.name);
      changed(t.name);
    }
    if (t.matches('[data-tint], [data-tint-on], [data-placeholder], #f-model')) {
      if (t.matches('[data-tint]')) $(`[data-tint-on="${t.dataset.tint}"]`).checked = true;
      readVisual();
      changed(t.id === 'f-model' ? 'model' : 'visual');
    }
  });
  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'status' || t.name === 'is_sample' || t.name === 'category_id') {
      read(t.name);
      changed(t.name);
    }
    if (t.matches('[data-tint-on], [data-placeholder], #f-model')) {
      readVisual();
      changed(t.id === 'f-model' ? 'model' : 'visual');
    }
  });
  // Fiyatı alandan çıkınca düzgün biçime getir (2850 → 2.850).
  form.elements.price_kurus.addEventListener('blur', () => {
    if (row.price_kurus != null) {
      priceText = formatKurus(row.price_kurus);
      form.elements.price_kurus.value = priceText;
    }
  });
  form.elements.slug.addEventListener('blur', () => {
    const s = slugify(form.elements.slug.value);
    if (s !== row.slug) {
      row.slug = s;
      form.elements.slug.value = s;
      changed('slug');
    }
  });

  $('[data-errors]').addEventListener('click', (e) => {
    const a = e.target.closest('[data-goto]');
    if (!a) return;
    e.preventDefault();
    const k = a.dataset.goto;
    const target = el.querySelector(`#f-${k}`) ?? el.querySelector(`[data-chips="${k}"] input`) ?? $('#f-model');
    target?.focus();
  });

  // Fotoğraf
  const fileInput = $('[data-file]');
  const drop = $('[data-drop]');
  const upload = async (file) => {
    if (!file) return;
    drop.querySelector('strong').textContent = 'Yükleniyor…';
    try {
      row.image_path = await api.uploadImage(file, row.slug || slugify(row.name) || 'urun');
      changed('image_path');
      toast('Fotoğraf yüklendi. Kalıcı olması için ürünü kaydedin.');
    } catch (err) {
      showErrors({ ...errors, image_path: err.message });
      toast(err.message, { error: true });
    } finally {
      drop.querySelector('strong').textContent = 'Fotoğraf yükle';
      fileInput.value = '';
    }
  };
  fileInput.addEventListener('change', () => upload(fileInput.files[0]));
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('is-over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('is-over');
    upload(e.dataTransfer.files[0]);
  });
  $('[data-remove-photo]').addEventListener('click', () => {
    row.image_path = null;
    changed('image_path');
  });

  // Kaydet
  const save = async () => {
    if (saving) return;
    readVisual();
    const errs = check();
    showErrors(errs, { focus: true });
    if (Object.keys(errs).length) {
      toast('Kaydedilmedi: işaretli alanları düzeltin.', { error: true });
      return;
    }
    saving = true;
    $('[data-save]').disabled = true;
    $('[data-save]').textContent = 'Kaydediliyor…';
    try {
      const saved = await api.saveProduct({ ...row, name: row.name.trim() });
      Object.assign(original, structuredClone(saved));
      row = structuredClone(saved);
      const base = isNew ? 'Ürün oluşturuldu' : 'Değişiklikler kaydedildi';
      toast(saved.status === 'published' ? `${base}.` : `${base}. ${STATUS[saved.status]} olduğu için sitede görünmüyor.`);
      if (isNew) {
        navigate(`#/urun/${saved.id}`, { force: true });
        return;
      }
      el.querySelector('#page-title').innerHTML = `${esc(saved.name)}<span>.</span>`;
      el.querySelector('.crumbs [aria-current]').textContent = saved.name;
      renderMeta();
      changed('saved');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Kaydedilemedi. Lütfen tekrar deneyin.';
      if (err.field) showErrors({ ...errors, [err.field]: msg }, { focus: true });
      toast(msg, { error: true });
    } finally {
      saving = false;
      const btn = $('[data-save]');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Kaydet';
      }
    }
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    save();
  });
  const onKey = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
    }
  };
  document.addEventListener('keydown', onKey);

  $('[data-publish]').addEventListener('click', () => {
    form.querySelector('[name="status"][value="published"]').checked = true;
    read('status');
    changed('status');
    save();
  });

  $('[data-revert]').addEventListener('click', () => {
    if (!confirm('Kaydedilmemiş değişiklikler geri alınsın mı?')) return;
    row = structuredClone(original);
    priceText = row.price_kurus == null ? '' : formatKurus(row.price_kurus);
    fill();
    showErrors({});
    changed('revert');
  });

  $('[data-delete]')?.addEventListener('click', async () => {
    if (!confirm(`“${original.name}” kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await api.deleteProduct(original.id);
      // Silme yetkisi yoksa veritabanı satırı silmez; gerçekten silindi mi kontrol et.
      if (await api.getProduct(original.id)) throw new ApiError('Bu işlem için yetkiniz yok (yalnızca “owner” silebilir).');
      toast('Ürün silindi.');
      navigate('#/urunler', { force: true });
    } catch (err) {
      toast(err.message || 'Silinemedi.', { error: true });
    }
  });

  function renderMeta() {
    $('[data-meta]').innerHTML = isNew
      ? ''
      : `<div>Oluşturulma: ${formatDate(original.created_at)}</div><div>Son güncelleme: ${formatDate(original.updated_at)}</div>`;
  }

  fill();
  renderMeta();
  updateCounts();
  updatePreview();
  statusHint();
  updateDirty();
  (isNew ? form.elements.name : el.querySelector('#page-title')).focus({ preventScroll: true });

  return {
    isDirty,
    cleanup: () => document.removeEventListener('keydown', onKey),
  };
}

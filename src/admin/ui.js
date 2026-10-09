import { formatKurus } from '../data/mapping.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const tl = (kurus) => `₺${formatKurus(kurus)}`;

export const STATUS = {
  published: 'Yayında',
  draft: 'Taslak',
  archived: 'Arşivde',
};

export const MODELS = {
  '': '3D şişe yok (yalnızca fotoğraf)',
  amber: 'Yuvarlak amber şişe',
  clear: 'Dikdörtgen şeffaf şişe',
};

// Değişiklik geçmişinde gösterilen alan adları
export const FIELD_LABELS = {
  name: 'Ad',
  slug: 'Adres',
  category_id: 'Kategori',
  status: 'Durum',
  price_kurus: 'Fiyat',
  volume_ml: 'Hacim',
  concentration: 'Yoğunluk',
  short_description: 'Kısa açıklama',
  description: 'Açıklama',
  notes_top: 'Üst notalar',
  notes_heart: 'Kalp notaları',
  notes_base: 'Dip notaları',
  character: 'Koku karakteri',
  longevity: 'Kalıcılık',
  usage: 'Kullanım',
  stock: 'Stok',
  visual: 'Görsel',
  image_path: 'Fotoğraf',
  is_sample: 'Örnek veri',
};

let toastTimer = 0;
export function toast(message, { error = false } = {}) {
  const el = document.querySelector('[data-toast]');
  el.textContent = message;
  el.classList.toggle('is-error', error);
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), error ? 6000 : 3200);
}

const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const formatDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : '—');

export function relTime(iso) {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'az önce';
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} gün önce`;
  return formatDate(iso);
}

// Nota girişi: Enter veya virgül ile ekler, × ile siler, Backspace son notayı siler.
export function chipsInput(root, { values = [], max = 8, maxLen = 40, label, onChange }) {
  let list = [...values];
  const draw = () => {
    root.innerHTML = `${list
      .map((v, i) => `<span class="chip">${esc(v)}<button type="button" data-i="${i}" aria-label="${esc(v)} notasını kaldır">×</button></span>`)
      .join('')}<input type="text" maxlength="${maxLen}" aria-label="${esc(label)}: nota ekle" placeholder="${list.length >= max ? '' : 'Nota yazıp Enter’a basın'}" ${list.length >= max ? 'disabled' : ''} />`;
  };
  const add = (raw, refocus = true) => {
    const parts = String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    let changed = false;
    for (const p of parts) {
      if (list.length >= max) break;
      if (list.some((x) => x.toLocaleLowerCase('tr') === p.toLocaleLowerCase('tr'))) continue;
      list.push(p.slice(0, maxLen));
      changed = true;
    }
    if (changed) {
      draw();
      onChange([...list]);
    } else if (!refocus) {
      root.querySelector('input').value = '';
    }
    if (refocus) root.querySelector('input')?.focus();
  };

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-i]');
    if (btn) {
      list.splice(Number(btn.dataset.i), 1);
      draw();
      onChange([...list]);
      root.querySelector('input')?.focus();
    } else if (e.target === root) {
      root.querySelector('input')?.focus();
    }
  });
  root.addEventListener('keydown', (e) => {
    const input = e.target.closest('input');
    if (!input) return;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.value.trim()) add(input.value);
    } else if (e.key === 'Backspace' && !input.value && list.length) {
      list.pop();
      draw();
      onChange([...list]);
      root.querySelector('input')?.focus();
    }
  });
  // Yazılıp Enter'a basılmadan alandan çıkılırsa da eklenir.
  root.addEventListener('focusout', (e) => {
    const input = e.target.closest('input');
    // Odak bir sonraki alana geçiyor: geri çekme (klavyeyle gezinme kilitlenmesin).
    if (input?.value.trim()) add(input.value, false);
  });
  draw();
  return {
    get values() {
      return [...list];
    },
  };
}

import { esc, tl, STATUS, FIELD_LABELS, formatDate } from '../ui.js';

const ACTION = { insert: 'oluşturdu', update: 'güncelledi', delete: 'sildi' };

// Anahtar sırasından bağımsız eşitlik (görsel ayarı aynıysa "değişti" sayılmasın).
const stable = (v) =>
  Array.isArray(v)
    ? v.map(stable)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => [k, stable(v[k])]))
      : v;
const same = (a, b) => JSON.stringify(stable(a ?? null)) === JSON.stringify(stable(b ?? null));

const show = (key, v) => {
  if (v == null || v === '') return '—';
  if (key === 'price_kurus') return tl(v);
  if (key === 'volume_ml') return `${v} ml`;
  if (key === 'status') return STATUS[v] ?? v;
  if (key === 'is_sample') return v ? 'Evet' : 'Hayır';
  if (key === 'image_path') return 'fotoğraf';
  if (Array.isArray(v)) return v.join(', ') || '—';
  if (key === 'visual') return [v.model ?? 'yok', v.glass, v.liquid, v.placeholder ? 'geçici' : ''].filter(Boolean).join(' · ');
  const s = String(v);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
};

export async function renderHistory(el, { api, session }) {
  el.innerHTML = '<p class="boot">Değişiklik geçmişi yükleniyor…</p>';
  const [entries, products] = await Promise.all([api.listAudit(80), api.listProducts()]);
  const exists = new Set(products.map((p) => p.id));

  const who = (id) => (id === session.userId ? 'Siz' : id === 'demo' ? 'Demo kullanıcı' : id ? `Yönetici ${String(id).slice(0, 8)}` : 'Sistem');

  const items = entries
    .filter((e) => e.table_name === 'products')
    .map((e) => {
      const name = e.new_data?.name ?? e.old_data?.name ?? 'Ürün';
      const diffs =
        e.action === 'update'
          ? Object.keys(FIELD_LABELS)
              .filter((k) => !same(e.old_data?.[k], e.new_data?.[k]))
              .map((k) => `<div>${FIELD_LABELS[k]}: <del>${esc(show(k, e.old_data?.[k]))}</del> → <ins>${esc(show(k, e.new_data?.[k]))}</ins></div>`)
          : [];
      const link = exists.has(e.record_id) ? `<a href="#/urun/${esc(e.record_id)}">${esc(name)}</a>` : `<strong>${esc(name)}</strong>`;
      return `
        <li>
          <time datetime="${esc(e.changed_at)}">${formatDate(e.changed_at)}</time>
          <div>
            ${esc(who(e.changed_by))} ${link} ürününü ${ACTION[e.action] ?? e.action}.
            ${diffs.length ? `<div class="diff">${diffs.join('')}</div>` : ''}
          </div>
        </li>`;
    });

  el.innerHTML = `
    <section class="page wrap" aria-labelledby="page-title">
      <div class="page-head">
        <h1 class="page-title" id="page-title" tabindex="-1">Değişiklik geçmişi.</h1>
      </div>
      <div class="table-wrap">
        ${items.length ? `<ol class="history">${items.join('')}</ol>` : '<p class="empty-state">Henüz bir değişiklik yapılmadı.</p>'}
      </div>
    </section>`;
}

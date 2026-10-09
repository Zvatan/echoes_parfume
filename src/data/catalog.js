import { SUPABASE_URL, SUPABASE_ANON_KEY, IMAGE_BUCKET, isSupabaseConfigured } from '../config.js';
import { replaceCatalog } from './products.js';
import { rowToProduct, rowToCategory } from './mapping.js';
import { readDemoDb } from './demo-store.js';

// Sitenin açılışta ürün kataloğunu yüklemesi. Öncelik sırası:
//   1. Supabase bağlıysa veritabanındaki YAYINDAKİ ürünler (başarılı sonuç önbelleğe alınır)
//   2. Supabase'e ulaşılamazsa son başarılı sonuç (önbellek)
//   3. Supabase bağlı değilse ve bu tarayıcıda demo paneli kullanıldıysa demo verisi
//   4. Hiçbiri yoksa koddaki örnek katalog
// Dönüş: { source: 'remote' | 'cache' | 'demo' | 'sample' }
const CACHE_KEY = 'echoes-catalog-cache-v1';
const TIMEOUT_MS = 6000;

const publicImageUrl = (path) =>
  path.startsWith('data:') || /^https?:/.test(path)
    ? path
    : `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;

function apply(categoryRows, productRows) {
  const cats = [...categoryRows].sort((a, b) => a.sort_order - b.sort_order).map(rowToCategory);
  const products = productRows
    .filter((r) => r.status === 'published')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => rowToProduct(r, publicImageUrl));
  replaceCatalog(cats, products);
}

async function fetchRows(table, query) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function loadCatalog() {
  if (isSupabaseConfigured()) {
    try {
      const [categories, products] = await Promise.all([
        fetchRows('categories', 'select=*&order=sort_order.asc'),
        fetchRows('products', 'select=*&status=eq.published&order=sort_order.asc'),
      ]);
      apply(categories, products);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), categories, products }));
      } catch {
        // Önbelleğe yazılamazsa (gizli sekme vb.) yine devam edilir.
      }
      return { source: 'remote' };
    } catch (err) {
      console.warn('[ECHOES] Ürünler veritabanından alınamadı; son kayıtlı katalog kullanılıyor.', err);
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (cached?.products?.length) {
          apply(cached.categories, cached.products);
          return { source: 'cache' };
        }
      } catch {
        // önbellek okunamadı → örnek katalog
      }
      return { source: 'sample' };
    }
  }

  const demo = readDemoDb();
  if (demo) {
    apply(demo.categories, demo.products);
    return { source: 'demo' };
  }
  return { source: 'sample' };
}

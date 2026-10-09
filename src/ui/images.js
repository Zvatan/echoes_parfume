// Ürün görselleri. 3D sahne varsa şişe modelinden (gerekirse geçici renk varyantıyla)
// kare görsel üretilir ve önbelleğe alınır; WebGL yoksa basit bir SVG silüet kullanılır.
const cache = new Map();
let renderer = null; // (visual, size) => dataURL

export function setImageRenderer(fn) {
  renderer = fn;
  cache.clear();
}

export function productImage(product, size = 520) {
  // Yönetim panelinden yüklenmiş gerçek fotoğraf her zaman önceliklidir.
  if (product.image) return product.image;
  const key = `${product.id}@${size}@${product.visual.model}${product.visual.glass ?? ''}${product.visual.liquid ?? ''}`;
  if (!cache.has(key)) {
    let url = null;
    try {
      if (product.visual.model) url = renderer?.(product.visual, size) ?? null;
    } catch (err) {
      console.warn('[ECHOES] Ürün görseli üretilemedi:', product.id, err);
    }
    cache.set(key, url ?? silhouette(product));
  }
  return cache.get(key);
}

// WebGL olmadan da ürünler ayırt edilebilsin diye şişe biçimi + sıvı rengi.
export function silhouette({ visual }) {
  const liquid = visual.liquid ?? (visual.model === 'amber' ? '#ab6c2b' : '#e0d6b8');
  const glass = visual.model === 'amber' ? visual.glass ?? '#be9158' : '#dfe6ec';
  const body =
    visual.model === 'amber'
      ? `<rect x="70" y="92" width="100" height="118" rx="30" fill="${glass}" opacity=".55"/>
         <rect x="74" y="140" width="92" height="66" rx="22" fill="${liquid}"/>
         <rect x="104" y="70" width="32" height="26" rx="3" fill="#161615"/><rect x="101" y="92" width="38" height="5" fill="#c9a35a"/>
         <rect x="92" y="122" width="56" height="40" rx="2" fill="#f3efe7"/>`
      : `<rect x="62" y="96" width="116" height="116" rx="8" fill="${glass}" opacity=".7"/>
         <rect x="68" y="108" width="104" height="98" rx="5" fill="${liquid}" opacity=".85"/>
         <rect x="100" y="66" width="40" height="32" rx="3" fill="#161615"/>
         <rect x="82" y="126" width="76" height="58" rx="1" fill="#f3efe7"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#f5f5f7"/>
    <ellipse cx="120" cy="214" rx="66" ry="7" fill="#000" opacity=".08"/>${body}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

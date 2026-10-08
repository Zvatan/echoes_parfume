// Hash tabanlı yönlendirme: site tek dosya olarak (çift tıklama, GitHub Pages) sunucu
// ayarı gerekmeden çalışır.
//   #/              ana sayfa          #hikaye  → ana sayfa + bölüme kaydır
//   #/kadin #/erkek kategori          #/urun/<id> ürün detayı      #/sepet sepet
export function parseRoute(hash = location.hash) {
  const h = decodeURIComponent(hash.replace(/^#/, ''));
  if (!h.startsWith('/')) return { name: 'home', anchor: h || null };
  const [first, second] = h.slice(1).split('/').filter(Boolean);
  if (!first) return { name: 'home', anchor: null };
  if (first === 'kadin' || first === 'erkek') return { name: 'category', id: first };
  if (first === 'urun' && second) return { name: 'product', id: second };
  if (first === 'sepet') return { name: 'cart' };
  return { name: 'notfound' };
}

export const href = {
  home: '#/',
  category: (id) => `#/${id}`,
  product: (id) => `#/urun/${encodeURIComponent(id)}`,
  cart: '#/sepet',
};

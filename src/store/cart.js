import { byId } from '../data/products.js';

// Sepet: localStorage'da { id, qty } listesi olarak tutulur; fiyat ve stok her zaman
// katalogdan okunur (eski kayıtlar katalog değişince kendiliğinden düzelir).
const KEY = 'echoes-cart-v1';
const listeners = new Set();
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
let items = read();

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return sanitize(Array.isArray(raw) ? raw : []);
  } catch {
    return [];
  }
}

// Bilinmeyen ürünleri at, adetleri 1..stok aralığına çek, tekrarları birleştir.
function sanitize(list) {
  const merged = new Map();
  for (const it of list) {
    const p = byId(it?.id);
    if (!p || p.stock <= 0) continue;
    const qty = (merged.get(p.id) ?? 0) + Math.floor(Number(it.qty) || 0);
    merged.set(p.id, qty);
  }
  return [...merged].map(([id, qty]) => ({ id, qty: clamp(qty, 1, byId(id).stock) })).filter((it) => it.qty > 0);
}

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Gizli sekme vb. durumlarda kalıcılık olmaz ama sepet oturum boyunca çalışır.
  }
  listeners.forEach((fn) => fn(getCart()));
}

export function getCart() {
  const lines = items.map(({ id, qty }) => {
    const product = byId(id);
    return { product, qty, total: product.price * qty };
  });
  return {
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal: lines.reduce((n, l) => n + l.total, 0),
  };
}

export const qtyInCart = (id) => items.find((it) => it.id === id)?.qty ?? 0;

// Sepete eklenebilecek en fazla adet (stok − sepetteki).
export const remainingStock = (id) => Math.max(0, (byId(id)?.stock ?? 0) - qtyInCart(id));

// Eklenen gerçek adedi döndürür (stok sınırına göre kırpılmış olabilir).
export function addToCart(id, qty = 1) {
  const room = remainingStock(id);
  const add = clamp(Math.floor(qty), 0, room);
  if (add <= 0) return 0;
  const line = items.find((it) => it.id === id);
  if (line) line.qty += add;
  else items.push({ id, qty: add });
  write();
  return add;
}

export function setQty(id, qty) {
  const p = byId(id);
  const line = items.find((it) => it.id === id);
  if (!p || !line) return;
  line.qty = clamp(Math.floor(qty) || 1, 1, p.stock);
  write();
}

export function removeFromCart(id) {
  items = items.filter((it) => it.id !== id);
  write();
}

export function onCartChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Başka bir sekmede yapılan değişiklikleri de yansıt.
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  items = read();
  listeners.forEach((fn) => fn(getCart()));
});

import { SAMPLE_CATEGORIES, SAMPLE_PRODUCTS } from './products.js';
import { productToRow } from './mapping.js';

// DEMO deposu: Supabase bağlanana kadar yönetim panelinin verisi bu tarayıcının
// localStorage'ında, veritabanıyla aynı satır biçiminde tutulur. Site de (aynı tarayıcıda)
// bu veriyi okur. Başka ziyaretçiler bu değişiklikleri GÖRMEZ.
export const DEMO_KEY = 'echoes-demo-db-v1';

const uuid = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

export function readDemoDb() {
  try {
    const db = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null');
    return db && Array.isArray(db.products) && Array.isArray(db.categories) ? db : null;
  } catch {
    return null;
  }
}

export function writeDemoDb(db) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(db));
}

export function seedDemoDb() {
  const now = new Date().toISOString();
  const db = {
    version: 1,
    categories: Object.values(SAMPLE_CATEGORIES).map((c, i) => ({
      id: c.id,
      title: c.title,
      short_title: c.short,
      intro: c.intro,
      sort_order: i,
      updated_at: now,
    })),
    products: SAMPLE_PRODUCTS.map((p, i) => ({ id: uuid(), ...productToRow(p, i), created_at: now, updated_at: now, updated_by: null })),
    audit: [],
  };
  writeDemoDb(db);
  return db;
}

export function clearDemoDb() {
  localStorage.removeItem(DEMO_KEY);
}

export { uuid };

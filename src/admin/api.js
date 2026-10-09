import { SUPABASE_URL, SUPABASE_ANON_KEY, IMAGE_BUCKET, isSupabaseConfigured } from '../config.js';
import { readDemoDb, writeDemoDb, seedDemoDb, clearDemoDb, uuid } from '../data/demo-store.js';

// Yönetim panelinin veri katmanı. Ekranlar yalnızca bu arayüzü kullanır:
//   mode, getSession(), signIn(), signOut(), listCategories(), listProducts(),
//   getProduct(id), saveProduct(row), deleteProduct(id), uploadImage(file, slug),
//   imageUrl(path), listAudit(limit), resetDemo()
// Supabase bağlıysa (src/config.js) canlı veritabanı, değilse bu tarayıcıdaki demo deposu.

// Sunucuya gönderilmeyen (veritabanının kendisinin yönettiği) alanlar.
const READ_ONLY = ['id', 'created_at', 'updated_at', 'updated_by'];
const writable = (row) => Object.fromEntries(Object.entries(row).filter(([k]) => !READ_ONLY.includes(k)));

export class ApiError extends Error {
  constructor(message, field = null) {
    super(message);
    this.field = field;
  }
}

export async function createApi() {
  return isSupabaseConfigured() ? createSupabaseApi() : createDemoApi();
}

// ---------------------------------------------------------------------------
// Canlı: Supabase
// ---------------------------------------------------------------------------
async function createSupabaseApi() {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, storageKey: 'echoes-admin-auth' },
  });

  // Veritabanı hatalarını Türkçe, alanla eşleştirilmiş mesaja çevir.
  const fail = (error) => {
    if (!error) return;
    if (error.code === '23505') throw new ApiError('Bu adres başka bir üründe kullanılıyor.', 'slug');
    if (error.code === '23514') throw new ApiError('Bir alan izin verilen sınırların dışında. Değerleri kontrol edin.');
    if (error.code === '23503') throw new ApiError('Seçilen kategori bulunamadı.', 'category_id');
    if (error.code === '42501' || /row-level security|permission denied/i.test(error.message)) {
      throw new ApiError('Bu işlem için yetkiniz yok.');
    }
    if (/failed to fetch|network/i.test(error.message)) throw new ApiError('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
    throw new ApiError(error.message || 'Beklenmeyen bir hata oluştu.');
  };

  const isAdmin = async () => {
    const { data, error } = await sb.rpc('is_admin');
    fail(error);
    return data === true;
  };

  return {
    mode: 'live',

    async getSession() {
      const { data } = await sb.auth.getSession();
      const user = data.session?.user;
      if (!user) return null;
      if (!(await isAdmin())) {
        await sb.auth.signOut();
        return null;
      }
      return { email: user.email, userId: user.id };
    },

    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        if (/invalid login/i.test(error.message)) throw new ApiError('E-posta veya şifre hatalı.');
        if (/email not confirmed/i.test(error.message)) {
          throw new ApiError('Bu e-posta henüz doğrulanmamış. Supabase’te Authentication → Users bölümünden kullanıcıyı onaylayın ya da “Auto Confirm User” işaretli olarak yeniden oluşturun.');
        }
        fail(error);
      }
      if (!(await isAdmin())) {
        await sb.auth.signOut();
        throw new ApiError('Bu hesabın yönetici yetkisi yok.');
      }
      return { email: data.user.email, userId: data.user.id };
    },

    async signOut() {
      await sb.auth.signOut();
    },

    async listCategories() {
      const { data, error } = await sb.from('categories').select('*').order('sort_order');
      fail(error);
      return data;
    },

    async listProducts() {
      const { data, error } = await sb.from('products').select('*').order('sort_order').order('name');
      fail(error);
      return data;
    },

    async getProduct(id) {
      const { data, error } = await sb.from('products').select('*').eq('id', id).maybeSingle();
      fail(error);
      return data;
    },

    async saveProduct(row) {
      const query = row.id
        ? sb.from('products').update(writable(row)).eq('id', row.id)
        : sb.from('products').insert(writable(row));
      const { data, error } = await query.select().single();
      fail(error);
      return data;
    },

    async deleteProduct(id) {
      const { error } = await sb.from('products').delete().eq('id', id);
      fail(error);
    },

    async uploadImage(file, slug) {
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      if (!ext) throw new ApiError('Yalnızca JPG, PNG veya WEBP yükleyebilirsiniz.', 'image_path');
      if (file.size > 5 * 1024 * 1024) throw new ApiError('Fotoğraf en fazla 5 MB olabilir.', 'image_path');
      const path = `${slug || 'urun'}/${Date.now()}.${ext}`;
      const { error } = await sb.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      fail(error);
      return path;
    },

    imageUrl(path) {
      return path ? sb.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl : null;
    },

    async listAudit(limit = 60) {
      const { data, error } = await sb.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(limit);
      fail(error);
      return data;
    },
  };
}

// ---------------------------------------------------------------------------
// Demo: bu tarayıcının localStorage'ı (Supabase bağlanana kadar)
// ---------------------------------------------------------------------------
function createDemoApi() {
  const load = () => readDemoDb() ?? seedDemoDb();
  const save = (db) => {
    try {
      writeDemoDb(db);
    } catch {
      throw new ApiError('Tarayıcı depolama alanı doldu. Daha küçük bir fotoğraf deneyin veya demo verisini sıfırlayın.');
    }
  };
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const audit = (db, table, action, oldRow, newRow) => {
    db.audit.unshift({
      id: Date.now() + Math.random(),
      table_name: table,
      record_id: (newRow ?? oldRow).id,
      action,
      changed_by: 'demo',
      changed_at: new Date().toISOString(),
      // Fotoğraflar (data URL) kayıtta yer kaplamasın.
      old_data: oldRow ? { ...oldRow, image_path: oldRow.image_path ? '[fotoğraf]' : null } : null,
      new_data: newRow ? { ...newRow, image_path: newRow.image_path ? '[fotoğraf]' : null } : null,
    });
    db.audit.length = Math.min(db.audit.length, 200);
  };

  return {
    mode: 'demo',
    async getSession() {
      return { email: 'Demo kullanıcı', userId: 'demo' };
    },
    async signIn() {
      return { email: 'Demo kullanıcı', userId: 'demo' };
    },
    async signOut() {},

    async listCategories() {
      return clone(load().categories);
    },
    async listProducts() {
      return clone([...load().products].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'tr')));
    },
    async getProduct(id) {
      return clone(load().products.find((p) => p.id === id) ?? null);
    },

    async saveProduct(row) {
      const db = load();
      if (db.products.some((p) => p.slug === row.slug && p.id !== row.id)) {
        throw new ApiError('Bu adres başka bir üründe kullanılıyor.', 'slug');
      }
      const now = new Date().toISOString();
      const i = db.products.findIndex((p) => p.id === row.id);
      let saved;
      if (i >= 0) {
        const old = db.products[i];
        saved = { ...old, ...writable(row), id: old.id, created_at: old.created_at, updated_at: now, updated_by: 'demo' };
        db.products[i] = saved;
        audit(db, 'products', 'update', old, saved);
      } else {
        const order = Math.max(-1, ...db.products.map((p) => p.sort_order)) + 1;
        saved = { sort_order: order, ...writable(row), id: uuid(), created_at: now, updated_at: now, updated_by: 'demo' };
        db.products.push(saved);
        audit(db, 'products', 'insert', null, saved);
      }
      save(db);
      return clone(saved);
    },

    async deleteProduct(id) {
      const db = load();
      const old = db.products.find((p) => p.id === id);
      db.products = db.products.filter((p) => p.id !== id);
      if (old) audit(db, 'products', 'delete', old, null);
      save(db);
    },

    async uploadImage(file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new ApiError('Yalnızca JPG, PNG veya WEBP yükleyebilirsiniz.', 'image_path');
      }
      // Demo depolama tarayıcıda; büyük fotoğraf küçültülerek saklanır.
      return downscale(file, 900);
    },
    imageUrl(path) {
      return path || null;
    },

    async listAudit(limit = 60) {
      return clone(load().audit.slice(0, limit));
    },

    resetDemo() {
      clearDemoDb();
    },
  };
}

// Demo modunda fotoğrafı en uzun kenarı `max` piksel olacak şekilde WEBP data URL'ye çevirir.
function downscale(file, max) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/webp', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ApiError('Fotoğraf okunamadı.', 'image_path'));
    };
    img.src = url;
  });
}

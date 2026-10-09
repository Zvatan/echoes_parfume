// Supabase bağlantısı (Supabase panelinde: Project Settings → Data API / API Keys).
//
// PROJECT_URL ve PUBLISHABLE_KEY boşsa:
//   • site, koddaki örnek kataloğu (src/data/products.js) gösterir;
//   • yönetim paneli DEMO modunda açılır: değişiklikler yalnızca o tarayıcıda saklanır.
//
// Publishable anahtar (sb_publishable_…, eski adıyla "anon") herkese açık olacak şekilde
// tasarlanmıştır; güvenliği veritabanındaki satır bazlı kurallar (supabase/migrations) sağlar.
// SECRET anahtarı (sb_secret_…, eski adıyla "service_role") ASLA buraya ya da sitenin
// herhangi bir dosyasına yazmayın.
const PROJECT_URL = 'https://gmhcyqwieukpmpfjbelk.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_8zSrR83B5blljG4FsaL_9Q_FMeAh8ow';

// Otomatik testler gerçek veritabanına dokunmaz (tests/run-all.mjs):
//   VITE_ECHOES_TEST=demo → bağlantı yok (demo modu)
//   VITE_ECHOES_TEST=mock → VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (sahte Supabase)
const TEST = import.meta.env.VITE_ECHOES_TEST;

export const SUPABASE_URL = TEST === 'demo' ? '' : TEST === 'mock' ? import.meta.env.VITE_SUPABASE_URL : PROJECT_URL;
export const SUPABASE_ANON_KEY = TEST === 'demo' ? '' : TEST === 'mock' ? import.meta.env.VITE_SUPABASE_ANON_KEY : PUBLISHABLE_KEY;

export const isSupabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const IMAGE_BUCKET = 'product-images';

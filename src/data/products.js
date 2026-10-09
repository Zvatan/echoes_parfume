// ECHOES ürün kataloğu.
//
// Ürünlerin asıl kaynağı yönetim panelidir (Supabase veritabanı). Bu dosyadaki ÖRNEK katalog:
//   • Supabase bağlı değilken ya da ulaşılamadığında sitede gösterilir;
//   • veritabanının başlangıç verisidir (npm run seed → supabase/seed.sql);
//   • demo modundaki yönetim panelinin başlangıç verisidir.
// Buradaki fiyat, hacim, nota, kalıcılık ve stok değerlerinin TAMAMI ÖRNEKTİR. Her ürünün
// "sample" alanı true olduğu sürece sitede "örnek veri" notu gösterilir.
//
// Uygulama PRODUCTS ve CATEGORIES'i kullanır; açılışta src/data/catalog.js bunları
// veritabanındaki güncel kayıtlarla değiştirir.
//
// visual.model:
//   'amber' → src/assets/echoes_perfume_bottle.glb (yuvarlak amber şişe)
//   'clear' → src/assets/echoes_perfume_3d/ECHOES_perfume_bottle.obj (+ .mtl) (dikdörtgen şeffaf şişe)
// visual.glass / visual.liquid: yalnızca GEÇİCİ görseller için ton değişikliği. Bu ürünlerin
//   kendi şişe modeli henüz yok; aynı şişenin farklı tonuyla geçici görsel üretilir
//   (placeholder: true). Kendi modeli olan ürünlerde (placeholder: false) detay sayfasında
//   döndürülebilir 3D model gösterilir.

export const CURRENCY = 'TRY';

export const SAMPLE_CATEGORIES = {
  kadin: {
    id: 'kadin',
    title: 'Kadın Parfümleri',
    short: 'Kadın',
    intro: 'Amberden yeşile, deriden tuza. Her biri başka bir iz bırakan kadın parfümleri.',
  },
  erkek: {
    id: 'erkek',
    title: 'Erkek Parfümleri',
    short: 'Erkek',
    intro: 'Narenciyeden irise, tütsüden yağmura. Sessiz ama akılda kalan erkek parfümleri.',
  },
};

const SAMPLE_LIST = [
  // --- Kadın ------------------------------------------------------------------
  {
    id: 'echo-no-01',
    name: 'Echo No. 01',
    category: 'kadin',
    price: 2850,
    volume: 50,
    concentration: 'Eau de Parfum',
    short: 'Sıcak amber ve pembe biberle açılan imza koku.',
    description:
      'ECHOES’un ilk sesi. Pembe biberin kısa parıltısı, iris ve tütsüyle yumuşar; tende amber ve sandal ağacının sıcak izi kalır.',
    notes: { top: ['Pembe biber', 'Bergamot', 'Kakule'], heart: ['İris', 'Tütsü', 'Gül'], base: ['Amber', 'Sandal ağacı', 'Vanilya'] },
    character: 'Amber · Baharatlı',
    longevity: 'Uzun kalıcı (8+ saat)',
    usage: 'Akşam ve serin günler için. Nabız noktalarına 2–3 sıkım.',
    stock: 12,
    visual: { model: 'amber', placeholder: false },
  },
  {
    id: 'silent-bloom',
    name: 'Silent Bloom',
    category: 'kadin',
    price: 2450,
    volume: 50,
    concentration: 'Eau de Parfum',
    short: 'Yağmurdan sonra kesilmiş yeşil saplar ve nergis.',
    description:
      'Çiçeğin kendisinden çok, çevresindeki havayı anlatır. Galbanumun yeşil keskinliği nergisle açılır, yosun ve beyaz misk sessizce yerleşir.',
    notes: { top: ['Galbanum', 'Armut yaprağı'], heart: ['Nergis', 'Vadi zambağı', 'Yasemin çayı'], base: ['Meşe yosunu', 'Beyaz misk'] },
    character: 'Yeşil · Çiçeksi',
    longevity: 'Orta kalıcı (5–6 saat)',
    usage: 'Gündüz ve ilkbahar için. Bileklere ve boyna hafifçe.',
    stock: 9,
    visual: { model: 'amber', glass: '#c5cfb2', liquid: '#b9c79a', placeholder: true },
  },
  {
    id: 'velvet-trace',
    name: 'Velvet Trace',
    category: 'kadin',
    price: 3350,
    volume: 100,
    concentration: 'Extrait de Parfum',
    short: 'Safranla ısıtılmış yumuşak deri.',
    description:
      'Kadife bir eldivenin içi gibi: safran ve ahududu ile parlayan, süet deri ve oud ile derinleşen yoğun bir koku.',
    notes: { top: ['Safran', 'Ahududu'], heart: ['Süet deri', 'Menekşe yaprağı'], base: ['Oud', 'Labdanum', 'Kaşmir ağacı'] },
    character: 'Deri · Odunsu',
    longevity: 'Çok uzun kalıcı (10+ saat)',
    usage: 'Az miktar yeterli. Tek sıkım, göğüs hizasına.',
    stock: 4,
    visual: { model: 'amber', glass: '#9a5a63', liquid: '#7a2f3b', placeholder: true },
  },
  {
    id: 'salt-letters',
    name: 'Salt Letters',
    category: 'kadin',
    price: 2250,
    volume: 50,
    concentration: 'Eau de Toilette',
    short: 'Deniz tuzu, sıcak taş ve kuruyan mürekkep.',
    description:
      'Sahilde unutulmuş bir mektup. Deniz tuzu ve ambrette tohumunun mineral tazeliği, sedirin kuru sıcaklığıyla buluşur.',
    notes: { top: ['Deniz tuzu', 'Greyfurt'], heart: ['Ambrette tohumu', 'Adaçayı'], base: ['Sedir', 'Ambergris akoru'] },
    character: 'Mineral · Ferah',
    longevity: 'Hafif–orta kalıcı (4–5 saat)',
    usage: 'Sıcak günler için. Gün içinde tazelenebilir.',
    stock: 15,
    visual: { model: 'amber', glass: '#b9cbd4', liquid: '#9fc0cc', placeholder: true },
  },

  // --- Erkek ------------------------------------------------------------------
  {
    id: 'afterglow',
    name: 'Afterglow',
    category: 'erkek',
    price: 2950,
    volume: 100,
    concentration: 'Eau de Parfum',
    short: 'Gün batımından sonra kalan ışık: narenciye ve beyaz misk.',
    description:
      'Yuzu ve neroli ile aydınlık açılır, sıcak tenin hemen üstünde kalan beyaz misk ve ambrox ile uzun süre parlamaya devam eder.',
    notes: { top: ['Yuzu', 'Neroli', 'Zencefil'], heart: ['Portakal çiçeği', 'Biber yaprağı'], base: ['Beyaz misk', 'Ambrox', 'Vetiver'] },
    character: 'Narenciye · Misk',
    longevity: 'Uzun kalıcı (7–8 saat)',
    usage: 'Her mevsim, gündüzden akşama. Boyun ve bileklere 2 sıkım.',
    stock: 10,
    visual: { model: 'clear', placeholder: false },
  },
  {
    id: 'paper-moon',
    name: 'Paper Moon',
    category: 'erkek',
    price: 2650,
    volume: 50,
    concentration: 'Eau de Parfum',
    short: 'Pudralı iris ve eski kâğıt.',
    description:
      'Klişelerden uzak, sakin bir erkek kokusu. İris kökü ve havuç tohumunun pudralı dokusu, papirüs ve tonka ile sıcak bir kâğıt hissine döner.',
    notes: { top: ['Havuç tohumu', 'Kişniş'], heart: ['İris kökü', 'Papirüs'], base: ['Tonka', 'Kaşmir ağacı', 'Misk'] },
    character: 'Pudralı · İris',
    longevity: 'Orta–uzun kalıcı (6–7 saat)',
    usage: 'Ofis ve gündüz için. Ten üzerinde yakından duyulur.',
    stock: 7,
    visual: { model: 'clear', liquid: '#d9cbe0', placeholder: true },
  },
  {
    id: 'night-archive',
    name: 'Night Archive',
    category: 'erkek',
    price: 3200,
    volume: 100,
    concentration: 'Extrait de Parfum',
    short: 'Tütsü, kakao ve ağır ahşap raflar.',
    description:
      'Gece kapanmış bir arşiv odası. Siyah biber ve tütsü dumanı, kakao ve labdanumun koyu tatlılığıyla birleşir.',
    notes: { top: ['Siyah biber', 'Elemi'], heart: ['Tütsü', 'Kakao'], base: ['Labdanum', 'Guaiac ağacı', 'Paçuli'] },
    character: 'Tütsü · Reçineli',
    longevity: 'Çok uzun kalıcı (10+ saat)',
    usage: 'Akşam ve kış için. Tek sıkım yeterli.',
    stock: 3,
    visual: { model: 'clear', liquid: '#5b3a24', placeholder: true },
  },
  {
    id: 'rain-theory',
    name: 'Rain Theory',
    category: 'erkek',
    price: 2350,
    volume: 50,
    concentration: 'Eau de Toilette',
    short: 'Islak taş, incir yaprağı ve vetiver.',
    description:
      'Yaz yağmurunun ilk dakikası. Ozonik bir açılış incir yaprağının sütlü yeşiline, oradan da topraksı vetivere iner.',
    notes: { top: ['Yağmur akoru', 'Limon kabuğu'], heart: ['İncir yaprağı', 'Nane'], base: ['Vetiver', 'Islak taş akoru'] },
    character: 'Yeşil · Ozonik',
    longevity: 'Orta kalıcı (4–6 saat)',
    usage: 'Sıcak ve nemli günler için. Gün içinde tazelenebilir.',
    stock: 14,
    visual: { model: 'clear', liquid: '#a9c4ae', placeholder: true },
  },
];

// Örnek katalog (değişmez kopya)
export const SAMPLE_PRODUCTS = Object.freeze(SAMPLE_LIST.map((p) => Object.freeze({ ...p, image: null, sample: true, status: 'published' })));

// Uygulamanın kullandığı canlı katalog (catalog.js açılışta günceller)
export const CATEGORIES = Object.fromEntries(Object.entries(SAMPLE_CATEGORIES).map(([k, c]) => [k, { ...c }]));
export const PRODUCTS = [...SAMPLE_PRODUCTS];

export function replaceCatalog(categories, products) {
  for (const k of Object.keys(CATEGORIES)) delete CATEGORIES[k];
  for (const c of categories) CATEGORIES[c.id] = c;
  PRODUCTS.splice(0, PRODUCTS.length, ...products.filter((p) => CATEGORIES[p.category]));
}

export const hasSampleData = (list = PRODUCTS) => list.some((p) => p.sample);

export const byId = (id) => PRODUCTS.find((p) => p.id === id) ?? null;
export const byCategory = (cat) => PRODUCTS.filter((p) => p.category === cat);

const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: CURRENCY, minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const formatPrice = (value) => money.format(value);

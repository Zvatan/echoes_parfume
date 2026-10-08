// Tüm düzenlenebilir site içeriği burada.
// `sample: true` olan alanlar ÖRNEK içeriktir; gerçek ürün bilgisiyle değiştirin
// ve bayrağı kaldırın — sayfadaki "Örnek içerik" etiketi kendiliğinden kaybolur.

export const story = [
  {
    no: '01',
    title: 'İz',
    text: 'Bir oda boşaldığında bile havada kalan bir şey vardır. ECHOES, o ince izin peşinde.',
  },
  {
    no: '02',
    title: 'Hafıza',
    text: 'Bir an, bir yer, bir ses. Bazen hepsini geri getirmek için tek bir nefes yeter.',
  },
  {
    no: '03',
    title: 'Yankı',
    text: 'Ses bir duvara çarpıp geri döner; biraz değişmiş, biraz yumuşamış. Koku da tende böyle yankılanır.',
  },
  {
    no: '04',
    title: 'İmza',
    text: 'Aynı koku her tende başka bir dille konuşur. ECHOES’un yankısı, onu taşıyanın sesidir.',
  },
];

// Ürün bölümündeki adımlar. `focus` değeri sahnedeki kamera kadrajını seçer
// (bkz. src/scene/states.js). Metinler yalnızca modelde görünen özellikleri anlatır.
export const anatomy = [
  { focus: 'whole', eyebrow: 'Şişe', title: 'Tek bir silüet.', text: 'Yumuşak omuzlar, yuvarlak gövde, sade oranlar.' },
  { focus: 'turn', eyebrow: 'Cam', title: 'Amber cam.', text: 'Işığı süzer, rengini içindekiyle paylaşır.' },
  { focus: 'cap', eyebrow: 'Kapak', title: 'Mat siyah kapak.', text: 'Işığı yansıtmak yerine yutar; şişeyi tek bir çizgiyle kapatır.' },
  { focus: 'collar', eyebrow: 'Bilezik', title: 'Çift altın bilezik.', text: 'Camla kapak arasında iki ince parıltı.' },
  { focus: 'label', eyebrow: 'Etiket', title: 'Krem etiket.', text: 'Bir halka, onu kesen bir çizgi ve ECHOES. Fazlası değil.' },
];

// Koku profili kartları. Gerçek koku notaları henüz paylaşılmadığı için hepsi örnektir.
export const profile = [
  {
    id: 'bottle',
    tone: 'dark',
    eyebrow: 'Eau de Parfum',
    title: 'ECHOES',
    text: 'Amber cam, mat siyah kapak, altın bilezik.',
    visual: 'bottle',
  },
  {
    id: 'top',
    tone: 'light',
    eyebrow: 'Üst notalar',
    title: 'Açılış.',
    text: 'İlk nefes. Parlak, kısa ve akılda kalan.',
    notes: ['Bergamot', 'Pembe biber', 'Mandalina'],
    sample: true,
  },
  {
    id: 'heart',
    tone: 'dark',
    eyebrow: 'Kalp notaları',
    title: 'Kalp.',
    text: 'Açılış dağıldıktan sonra kokunun asıl sesi.',
    notes: ['İris', 'Yasemin', 'Kakule'],
    sample: true,
  },
  {
    id: 'base',
    tone: 'light',
    eyebrow: 'Dip notaları',
    title: 'Yankı.',
    text: 'Saatler sonra tende kalan iz.',
    notes: ['Amber', 'Sandal ağacı', 'Misk'],
    sample: true,
  },
  {
    id: 'family',
    tone: 'dark',
    eyebrow: 'Koku ailesi',
    title: 'Karakter.',
    text: 'Kokunun genel yönü.',
    notes: ['Amber', 'Odunsu'],
    sample: true,
  },
  {
    id: 'wear',
    tone: 'light',
    eyebrow: 'Kullanım',
    title: 'Yoğunluk.',
    text: 'Eau de Parfum. Nabız noktalarına, ölçülü.',
    meter: 0.7,
    sample: true,
  },
];

// İletişim ve sosyal medya. Boş bırakılan alanlar sayfada bağlantı olarak gösterilmez.
// Örnek: { label: 'Instagram', url: 'https://instagram.com/hesap' }
export const contact = {
  email: '',
  social: [
    { label: 'Instagram', url: '' },
    { label: 'TikTok', url: '' },
    { label: 'Pinterest', url: '' },
  ],
};

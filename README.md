# ECHOES — Eau de Parfum web sitesi

Vite + Three.js + GSAP ScrollTrigger + Lenis.

## Siteyi açma

**En kolayı:** Kök klasördeki `index.html` dosyasına çift tıklayın. Bu dosya sitenin
hazır, tek dosyalık halidir (CSS, JS, 3D modeller ve görseller içine gömülü); sunucu
gerektirmez, tek başına başka bir yere kopyalanabilir ve GitHub Pages'te depo kökünden
doğrudan yayınlanabilir. (`dist/index.html` aynı dosyanın bir kopyasıdır.)

Kaynak sayfa `src/index.html`'dir. Kodda değişiklik yaptıysanız hazır sürümü yeniden üretin:

```bash
npm install       # yalnızca ilk sefer
npm run build     # kökteki index.html ve dist/index.html'i yeniden oluşturur
```

Geliştirme sırasında anlık önizleme için: `npm run dev` → http://localhost:5173
(panel: http://localhost:5173/admin/)

## Yönetim paneli

Kök klasördeki **`admin.html`** dosyasına çift tıklayın. Ürünlerin fiyatını, açıklamasını,
notalarını, stokunu, durumunu (Yayında / Taslak / Arşivde), fotoğrafını ve 3D şişe ayarını
buradan düzenlersiniz; yeni ürün ekleyebilir, değişiklik geçmişini görebilirsiniz.

- **Canlı mod (şu anki durum):** Supabase bağlı (`src/config.js`). Panel giriş ister;
  değişiklikler veritabanına kaydedilir ve tüm ziyaretçiler görür. Yalnızca **Yayında**
  durumundaki ürünler sitede görünür.
- **Demo modu:** `src/config.js`'teki proje adresi ve anahtar boşaltılırsa panel girişsiz açılır,
  değişiklikler yalnızca o tarayıcıda saklanır (panelde ve sitede bu açıkça yazar).

Kurulum rehberi: `supabase/KURULUM.md`.

## Testler

- `npm test` — tüm otomatik testler. **Gerçek veritabanına dokunmaz**: ayrı bir demo derlemesi
  (`tests/output/build/`) ve sahte Supabase yanıtları kullanır.
- `npm run test:real` — gerçek Supabase projesine karşı yalnızca okuma ve zararsız yetki
  denemeleri; hiçbir veriyi değiştirmez.

Veritabanı şeması ve güvenlik kuralları: `supabase/migrations/`. Başlangıç verisi
`npm run seed` ile örnek katalogdan üretilir (`supabase/seed.sql`).

## Sayfalar

| Adres          | Sayfa |
| -------------- | ----- |
| `#/`           | Ana sayfa: 3D açılış, hikâye, şişe bölümü, koleksiyon rafı, kategori girişleri |
| `#/kadin`      | Kadın Parfümleri (fiyata göre sıralama) |
| `#/erkek`      | Erkek Parfümleri |
| `#/urun/<id>`  | Ürün detayı: görsel/3D model, fiyat, adet, ara toplam, Sepete Ekle, notalar |
| `#/sepet`      | Sepet: adet değiştirme, kaldırma, toplamlar (tarayıcıda saklanır) |

Sayfalar hash (`#/...`) ile yönlendirilir; bu sayede site tek dosya halinde, sunucu
ayarı gerekmeden çalışır ve ürün bağlantıları doğrudan paylaşılabilir.

## Yapı

```
index.html                  HAZIR SİTE (npm run build üretir; elle düzenlemeyin)
admin.html                  HAZIR YÖNETİM PANELİ (npm run build üretir; elle düzenlemeyin)
dist/                       Hazır dosyaların kopyaları
vite.config.js              Site derleme ayarı
vite.admin.config.js        Panel derleme ayarı
build/single-file.js        Tek dosya derleme eklentisi
src/config.js               Supabase bağlantı ayarı (proje adresi + publishable anahtar)
src/index.html              Kaynak sayfa: iskelet, menü, ana sayfa bölümleri, amblem
src/admin/                  Yönetim paneli (api.js: Supabase/demo veri katmanı, views/: ekranlar)
src/data/products.js        ÖRNEK katalog + uygulamanın canlı katalog listesi
src/data/catalog.js         Sitenin açılışta katalogu yüklemesi (Supabase → önbellek → demo → örnek)
src/data/mapping.js         Veritabanı satırı ↔ site ürünü; Türkçe fiyat ve adres yardımcıları
src/data/validate.js        Ürün doğrulama kuralları (veritabanı kısıtlarıyla aynı)
src/data/demo-store.js      Demo modu deposu (tarayıcı)
supabase/                   Veritabanı şeması, güvenlik kuralları, başlangıç verisi, kurulum rehberi
scripts/generate-seed.mjs   Örnek katalogdan seed.sql üretir (npm run seed)
src/store/cart.js           Sepet (localStorage), stok sınırları, toplamlar
src/router.js               Sayfa adresleri
src/pages/                  Kategori, ürün detayı ve sepet sayfaları
src/ui/components.js        Ortak bileşenler: ürün kartı, adet kontrolü, konum yolu
src/ui/images.js            Ürün görselleri (3D modelden üretilir; WebGL yoksa SVG yedek)
src/content.js              Ana sayfa metinleri (hikâye, şişe bölümü), iletişim, sosyal medya
src/main.js                 Açılış akışı, yönlendirme, 3D sahnenin sayfalara bağlanması
src/scene/models.js         İki 3D modelin yüklenmesi ve materyalleri
src/scene/BottleScene.js    Three.js sahnesi, ışık, model değiştirme, görsel üretimi
src/scene/states.js         Şişenin her bölümdeki / ürün sayfasındaki kadrajı
src/scroll/choreography.js  Ana sayfa kaydırma → şişe pozu eşlemesi
src/styles/tokens.css       Ortak tasarım değişkenleri (site + panel)
src/styles/main.css         Site stilleri
src/assets/                 3D modeller ve etiket görseli
```

## Ürün ve içerik güncelleme

- **Ürünler:** Yönetim panelinden (`admin.html`). Mevcut fiyat, hacim, nota, kalıcılık ve
  stok değerlerinin hepsi **örnektir**. Bir ürünün bilgileri gerçek veriyle güncellenince
  paneldeki “Örnek veri” işareti kaldırılır; o ürünün sitedeki "örnek veri" notu kalkar.
- **Görseller:** Kendi 3D modeli olan iki ürün var: `echo-no-01` (kadın, amber şişe, `.glb`)
  ve `afterglow` (erkek, şeffaf dikdörtgen şişe, `echoes_perfume_3d/*.obj + .mtl`). Bu iki
  ürünün sayfasında döndürülebilir 3D model gösterilir. Diğer altı ürünün görseli
  **geçicidir** (`placeholder: true`): aynı şişelerin farklı renk tonlarıyla üretilir ve
  ürün sayfasında "Geçici ürün görseli" yazar.
- **Ödeme:** Online ödeme ve sipariş gönderimi yoktur; sepet sayfasındaki "Ödemeye geç"
  butonu bu yüzden pasiftir.
- `contact.email` ve `contact.social[].url` (`src/content.js`) boş bırakılırsa footer'da
  bağlantı gösterilmez.

## Notlar

- GLB'de normal verisi yoktu; normaller çalışma anında hesaplanır. Modeldeki düz etiket
  silindirik gövdenin dışına taştığı için aynı doku ve UV'lerle gövdeye sarılır; kapak,
  boyun camıyla çakışmayı önlemek için radyal olarak %1,5 genişletilir.
- Yeni OBJ modelinde UV/normal yoktu; renkler MTL dosyasından okunur, sıvı MTL'deki
  saydamlıkla (`d 0.72`) çizilir. Etiketteki logo ve "ECHOES" yazısı modelde ayna
  görüntüsü olarak tanımlıydı; yalnızca bu katman yatay aynalanarak doğru okunur hale
  getirildi (konum ve boyut değişmedi).
- WebGL yoksa sayfa etiket görseliyle ve bunu belirten bir notla çalışır.
- `prefers-reduced-motion` açıkken yumuşak kaydırma, giriş animasyonu ve kaydırmaya bağlı
  sürekli dönüş kapanır; şişe bölümler arasında adım adım geçer.

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
dist/index.html             Hazır sitenin kopyası
vite.config.js              Tek dosya derleme ayarı
src/index.html              Kaynak sayfa: iskelet, menü, ana sayfa bölümleri, amblem
src/data/products.js        ÜRÜN KATALOĞU: ad, kategori, fiyat, hacim, notalar, stok, görsel/model
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
src/styles/main.css         Tasarım sistemi ve tüm stiller
src/assets/                 3D modeller ve etiket görseli
```

## Ürün ve içerik güncelleme

- **Ürünler:** `src/data/products.js`. Fiyat, hacim, nota, kalıcılık ve stok değerlerinin
  hepsi **örnektir**. Gerçek bilgiler girildikten sonra `SAMPLE_DATA = false` yapılınca
  sayfalardaki "örnek veri" notları kalkar.
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

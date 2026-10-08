# ECHOES — Eau de Parfum web sitesi

Vite + Three.js + GSAP ScrollTrigger + Lenis.

## Siteyi açma

**En kolayı:** `index.html` (veya `dist/index.html`) dosyasına çift tıklayın.
`dist/index.html` her şeyin (CSS, JS, 3D model, görseller) gömülü olduğu tek dosyalık
sürümdür; sunucu gerektirmez ve tek başına başka bir yere kopyalanabilir. Kök klasördeki
`index.html` çift tıklanınca otomatik olarak ona yönlenir.

Kodda değişiklik yaptıysanız tek dosyalık sürümü yeniden üretin:

```bash
npm install       # yalnızca ilk sefer
npm run build     # dist/index.html'i yeniden oluşturur
```

Geliştirme sırasında anlık önizleme için: `npm run dev` → http://localhost:5173

## Yapı

```
index.html                  Sayfa iskeleti ve amblem (SVG sembolü)
dist/index.html             Tek dosyalık, çift tıklanarak açılan site (npm run build üretir)
vite.config.js              Tek dosya derleme ayarı
src/assets/                 3D model, etiket görseli (3D yüklenemezse yedek), favicon
src/content.js              TÜM metinler, koku notaları, iletişim ve sosyal bağlantılar
src/main.js                 Açılış akışı: yükleme → sahne → koreografi → giriş animasyonu
src/scene/BottleScene.js    Three.js sahnesi, materyaller, ışık, etiket sarma, görsel üretimi
src/scene/states.js         Şişenin her bölümdeki kadrajı (ekran oranına göre)
src/scroll/choreography.js  Kaydırma → şişe pozu / bölüm durumu eşlemesi
src/ui/                     İçerik yazımı, yükleme ekranı, menü, kart rafı
src/styles/main.css         Tasarım sistemi ve tüm stiller
```

## İçerik güncelleme

`src/content.js` dosyasını düzenleyin:

- Koku profili kartlarındaki notalar **örnektir** (`sample: true`). Gerçek bilgilerle
  değiştirip `sample` bayrağını kaldırınca kartlardaki "Örnek içerik" etiketi kaybolur.
- `contact.email` ve `contact.social[].url` boş bırakılırsa footer'da bağlantı gösterilmez.

## Notlar

- GLB'de normal verisi yoktu; normaller çalışma anında hesaplanır. Modeldeki düz etiket
  silindirik gövdenin dışına taştığı için aynı doku ve UV'lerle gövdeye sarılır; kapak,
  boyun camıyla çakışmayı önlemek için radyal olarak %1,5 genişletilir.
- WebGL yoksa sayfa etiket görseliyle ve bunu belirten bir notla çalışır.
- `prefers-reduced-motion` açıkken yumuşak kaydırma, giriş animasyonu ve kaydırmaya bağlı
  sürekli dönüş kapanır; şişe bölümler arasında adım adım geçer.

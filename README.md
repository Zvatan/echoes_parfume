# ECHOES — Eau de Parfum web sitesi

Vite + Three.js + GSAP ScrollTrigger + Lenis.

## Çalıştırma

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # dist/ klasörüne üretim derlemesi
npm run preview   # derlemeyi yerelde sunar
```

## Yapı

```
index.html                  Sayfa iskeleti ve amblem (SVG sembolü)
public/models/              echoes_perfume_bottle.glb (sitede kullanılan model)
public/images/              echoes_label_texture.png (3D yüklenemezse yedek görsel)
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

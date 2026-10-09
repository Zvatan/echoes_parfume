# ECHOES — proje direktifleri ve değişiklik kaydı

Bu dosya her oturumun başında okunur. Buradaki direktifler kullanıcının açık talimatlarıdır;
yeni bir iş yapmadan önce uyulmalıdır. Kullanıcıyla Türkçe yazışılır.

## 1. Kalıcı direktifler (kullanıcı talimatları)

### Çalışma şekli
- **Her adımın sonucunun gerçekten çalışıp çalışmadığını kontrol et, öyle ilerle.**
  "Bitti" demeden önce siteyi kullanıcının açacağı yollarla tarayıcıda test et (bkz. §4).
  Bozuk bir şey varsa önce onu düzelt. Neyi test ettiğini ve neyi test edemediğini açıkça yaz.
- **Kullanıcı siteyi `index.html`'e çift tıklayarak (file://) açar**, terminal komutu
  çalıştırmaz. Site sunucusuz çalışmalı; geliştirme sunucusunda çalışması yeterli değildir.
  Test sunucularını kapatıp kullanıcıyı çalışan bir yol olmadan bırakma.
- **GitHub'a gidecek dosyalar masaüstündeki `site_taslak` klasöründe tutulur.** Projede
  değişiklik yapınca bu klasörü eşitle ve oradaki kopyayı da test et (bkz. §5).
- Kullanıcı ayrıntı için onay beklemez; tasarım kararlarını profesyonelce kendin ver.

### Dürüstlük kuralları
- Doğrulanmamış marka hikâyesi, üretim iddiası, gerçek olmayan sosyal medya hesabı veya
  iletişim bilgisi uydurma. Boş bırakılan iletişim/sosyal alanlar sitede "yakında" görünür.
- Fiyat, nota, kalıcılık, stok gibi ticari bilgiler henüz **örnek veridir**; gerçekmiş gibi
  sunma. Sitede örnek olduğu yazılı kalmalı (ürün bazlı `sample` / veritabanında `is_sample`;
  paneldeki "Örnek veri" işareti).
- **Sahte ödeme sistemi yok.** "Ödemeye geç" butonu pasif kalır ve nedeni yazılır.
- 3D model yüklenemezse yedek görsel göster ama 3D çalışıyormuş gibi gösterme.
- Kendi modeli olmayan ürünlerin görselleri "Geçici ürün görseli" olarak işaretlidir.

### Tasarım ve marka
- Tasarım dili referansı: `örnek_site.png` (Apple Store sayfası düzeni). Açık gri zemin
  `#f5f5f7`, koyu metin `#1d1d1f`, iki tonlu başlıklar ("**Hikâye.** Geride kalan her şey."),
  18px köşeli kartlar, buzlu ince menü. Vurgu rengi şişenin amberi (`--amber`).
- Animasyon referansı: awwwards "Ciao Energy" (yükleme geçişi, ortada ürün, kaydırmaya bağlı
  sahneler, yatay kart rafı, başa dönen döngü). Birebir kopyalanmaz, ECHOES'a uyarlanır.
- Mevcut ECHOES logosunu ve 3D şişe modellerini koru; logoyu bozma, modelde olmayan ayrıntı
  uydurma. Minimalist, premium; gereksiz animasyon ve uzun metinden kaçın.
- Responsive (masaüstü/tablet/mobil), `prefers-reduced-motion`, klavye erişimi, yeterli
  kontrast, mobilde ≥44px dokunma alanları.

### E-ticaret kapsamı (2. brif)
- Çok ürünlü mağaza: en az 4 kadın + 4 erkek parfümü, merkezi katalog (`src/data/products.js`).
- Eski amber model (`echoes_perfume_bottle.glb`) → **Kadın**, ürün **Echo No. 01**.
  Yeni model (`echoes_perfume_3d/*.obj + .mtl`) → **Erkek**, ürün **Afterglow**.
- Kategori sayfaları (Kadın / Erkek), ürün detay sayfası (adet, ara toplam, Sepete Ekle,
  stok sınırı, üst/kalp/dip notaları), çalışan sepet (localStorage, sayaç, adet değiştirme,
  kaldırma, toplamlar, boş sepet ekranı). Kullanıcı sepete eklenen ürünleri görebilmeli.
- Kadın = çiçeksi, erkek = odunsu gibi klişelerden kaçın; her ürünün bilgisi kendine ait olsun.

### Back-end / yönetim paneli (3. aşama — kullanıcı "A seçeneği"ni seçti)
- Mimari: **Supabase** (PostgreSQL + Auth + Storage + Row Level Security) + ECHOES
  tasarımında **kendi yönetim panelimiz** (`admin.html`). Hazır CMS veya e-ticaret platformu değil.
- Kullanıcı fiyat, açıklama ve tüm ürün bilgilerini panelden düzenleyebilmeli.
- **Supabase hesabını kullanıcı açar** (hesap/ödeme bilgisi kullanıcıda kalır); gerçek bağlantı
  ve sonraki adımlar (sipariş, ödeme, fatura, KVKK, kargo) **kullanıcıyla birlikte** yapılacak.
  Rehber: `supabase/KURULUM.md`.
- Hesap bağlanana kadar panel **demo modunda** çalışır (veri tarayıcıda); panelde ve sitede bu
  açıkça yazmalı. Demo verisini canlı veriymiş gibi sunma.
- `service_role` / secret (`sb_secret_…`) anahtarı hiçbir dosyaya yazılmaz; sitede yalnızca
  publishable (`sb_publishable_…`, eski "anon") anahtar kullanılır.
- **Supabase bağlandı (2026-10-09):** proje `https://gmhcyqwieukpmpfjbelk.supabase.co`;
  migrasyonlar + seed kullanıcı tarafından SQL Editor'da çalıştırıldı (8 ürün yayında).
  Yönetici şifresi yalnızca kullanıcıda; **asla isteme**. Panelde giriş ve yazma testini kullanıcı yapar.
- **Otomatik testler gerçek veritabanına yazmaz.** `npm test` ayrı demo derlemesi + sahte
  Supabase kullanır; gerçek projeye yalnızca `npm run test:real` (okuma + zararsız yetki
  denemeleri) bağlanır. Gerçek veriyi değiştiren bir test yazma.

## 2. Teknik yapı

- Vite + vanilla JS + Three.js + GSAP ScrollTrigger + Lenis (başka çalışma bağımlılığı yok).
- **Kaynak sayfa `src/index.html`** (Vite `root: 'src'`). `npm run dev` → http://localhost:5173
- **`npm run build`** iki tek dosya üretir (her şey gömülü): site → `dist/index.html` + **kökteki
  `index.html`**; panel (`vite.admin.config.js`, kaynak `src/admin/`) → `dist/admin.html` + **kökteki
  `admin.html`**. Kökteki bu iki dosya üretilmiştir — **elle düzenleme**, kaynağı değiştirip derle.
  Eklenti: `build/single-file.js`.
- Panel geliştirme adresi: `npm run dev` → http://localhost:5173/admin/
- Katalog: `src/data/products.js` artık ÖRNEK katalog (`SAMPLE_PRODUCTS`) + canlı liste
  (`PRODUCTS`, `CATEGORIES`). Açılışta `src/data/catalog.js` sırayla Supabase → önbellek →
  demo deposu → örnek katalogdan yükler ve `replaceCatalog()` ile değiştirir; sonra
  `reloadCart()` sepeti yeni stoka göre düzeltir. "Örnek veri" notu ürün bazlı (`sample`).
- Veritabanı: `supabase/migrations/0001_catalog.sql` (tablolar, kısıtlar, RLS, audit tetikleyici),
  `0002_storage.sql` (fotoğraf kovası), `seed.sql` (`npm run seed` örnek katalogdan üretir).
  Fiyat **kuruş** cinsinden tam sayı (`price_kurus`). Doğrulama kuralları `src/data/validate.js`
  ile veritabanı kısıtları **aynı tutulmalı**.
- Supabase ayarı: `src/config.js` (`PROJECT_URL`, `PUBLISHABLE_KEY`; boşsa demo modu).
  `VITE_ECHOES_TEST=demo` → bağlantısız; `VITE_ECHOES_TEST=mock` → `VITE_SUPABASE_URL/ANON_KEY`.
  `ECHOES_OUT_DIR` verilirse derleme o klasöre gider ve kökteki index.html/admin.html'e dokunmaz.
- Publishable anahtar REST'te `apikey` + `Authorization: Bearer` ile çalışıyor (gerçek projede doğrulandı).
- Panel veri katmanı `src/admin/api.js`: aynı arayüzün Supabase ve demo uygulaması.
- Sayfalar hash yönlendirmeli: `#/`, `#/kadin`, `#/erkek`, `#/urun/<id>`, `#/sepet`;
  `#hikaye` gibi bölüm bağlantıları ana sayfaya dönüp kaydırır.
- Tek renderer: ana sayfada kaydırma koreografisi (`scroll/choreography.js`), ürün
  sayfasında şişe `[data-anchor]` kutusuna bağlanır (`states.js → anchorPose`, `snap`).
- Ürün kart görselleri açılışta 3D modelden üretilir (`ui/images.js`); WebGL yoksa SVG silüet.
- Dosya haritası ve içerik güncelleme talimatları: `README.md`.

## 3. Öğrenilen tuzaklar (tekrar yaşanmasın)

- **PowerShell `Set-Content`/`Get-Content -Raw` ile Türkçe içerikli dosya düzenleme** —
  kodlamayı bozar (bir kez `BottleScene.js` bozuldu). Edit/Write aracı veya UTF-8 açık
  Python kullan.
- `prefers-reduced-motion` CSS'inde süre **`0s`** olmalı; `0.01ms` her özelliği geçişe
  sokar ve ScrollTrigger pin aralıklarını yanlış ölçtürür.
- Görünüm değişince (ana sayfa ↔ sayfa) `lenis.resize()` çağrılmadan kaydırma eski sayfa
  yüksekliğine takılır.
- Three.js transmission geçişi yalnızca opak nesneleri örnekler: koyu sahnedeki arka ışık
  `AdditiveBlending` + opak listede tutulur.
- Yeni OBJ: MTL anahtarları büyük/küçük harfe duyarlı (`Glass`, `Metal`…); Kd değerleri sRGB.
  Etiketteki "Ink" katmanı modelde aynalıydı → `scale.x = -1`. Sıvı MTL'deki `d 0.72` ile
  yarı saydam, camın `depthWrite` kapalı.
- Amber GLB: normal verisi yok (crease normals), düz etiket gövdeye sarılır, kapak boyun
  camıyla çakışmasın diye radyal %1,5 büyütülür.
- `store/cart.js`: modül yüklenirken çağrılan fonksiyonların kullandığı `const`'lar üstte
  tanımlı olmalı (TDZ hatası sepeti sessizce boşaltmıştı).
- Kontrol listesi testlerinin yanında **ekran görüntülerine de bak**: mobil menünün saydam
  açılması, ürün sayfasında 3D "hayalet" şişe ve paneldeki gizli olması gereken butonlar
  yalnızca görsellerden yakalandı.
- PowerShell'de karmaşık tırnaklı tek satırlık Python/JS çalıştırma — ayrıştırma hatası verir
  ve komutun tamamı çalışmaz. Betiği dosyaya yazıp çalıştır.
- Türkçe büyük/küçük harf: `toLowerCase()` "I"yı "i" yapar; `toLocaleLowerCase('tr')` kullan.
- Panel CSS'inde `.btn { display: inline-flex }` `hidden` özniteliğini ezer → `[hidden] { display:none !important }`.
- Nesne karşılaştırmasında (kaydedilmemiş değişiklik, değişiklik geçmişi) anahtar sırası
  farkı yanlış "değişti" sonucu verir → sıradan bağımsız (`stable`) karşılaştırma.
- Vite `build.outDir`, `root`'a (`src`) göre çözülür; eklentilerde `resolve(config.root, outDir)`.
- Bir değişikliği "reddedildi" diye test ederken hatanın **sebebini** de kontrol et (yazım
  hatası da hata döndürür).

## 4. Doğrulama prosedürü (her değişiklikten sonra)

**`npm test`** — yayın derlemesini doğrular, ayrı bir **demo test derlemesi**
(`tests/output/build/`) üretir, sunucuları açar, tüm test setlerini çalıştırır, özet yazar ve
sunucuları kapatır (`tests/run-all.mjs`; bir kısmı için: `npm test -- panel`). Gerçek
veritabanına dokunmaz. Son tam çalıştırma (2026-10-09): 13 set, 369 kontrol, hepsi geçti.

**`npm run test:real`** — gerçek Supabase projesine karşı (yayın derlemesi, çift tıklama yolu):
okuma, ziyaretçi yetki reddi, sitedeki ürünlerin veritabanıyla eşleşmesi, panelin canlı modda
açılması ve gerçek giriş servisinin hata mesajı. Veri değiştirmez. Son: 19/19 geçti.
`ROOT=file:///…/site_taslak/` ile başka bir klasör test edilebilir.

| Test seti (`tests/`) | Kapsam |
| --- | --- |
| `unit.mjs` | Türkçe fiyat ayrıştırma/biçim, adres üretimi, doğrulama kuralları |
| `cart.mjs` | Katalog bütünlüğü, sepet: ekleme, stok, silme, yenilemede korunma |
| `sql.mjs` | PGlite'ta gerçek PostgreSQL: şema, kısıtlar, RLS (ziyaretçi/yetkisiz/editör/owner), audit, depolama |
| `site-e2e.mjs` | Site masaüstü: tüm mağaza akışı (çift tıklama, statik sunucu, dev) |
| `site-mobile.mjs`, `home-regress.mjs`, `edge.mjs`, `deeplink.mjs` | Mobil, ana sayfa animasyonları, WebGL yok / az hareket, doğrudan bağlantı |
| `admin-e2e.mjs` | Panel demo modu: liste/filtre, düzenleme, doğrulama, yeni ürün, fotoğraf, arşiv, geçmiş, sitede yansıma, mobil |
| `live-e2e.mjs` | Canlı mod kod yolu, **sahte** Supabase yanıtlarıyla: giriş/yetki, PATCH, önbellek/geri düşme |

Testlerin yanında `tests/output/` ekran görüntülerine (masaüstü 1440×900, mobil 390×844) bak.
Yönetici olarak giriş + kaydetme gerçek projede yalnızca kullanıcı tarafından denenebilir
(şifre kullanıcıda); sonucunu kullanıcıdan teyit et.

## 5. `site_taslak` eşitleme

Repo dosyaları: `index.html` ve `admin.html` (üretilmiş), `src/`, `dist/`, `supabase/`,
`scripts/`, `build/`, `tests/` (`tests/output/` hariç), `package.json`, `package-lock.json`,
`vite.config.js`, `vite.admin.config.js`, `README.md`, `CLAUDE.md`, `.gitignore`
(`node_modules/` hariç). Konulmayanlar: `node_modules`, `örnek_site.png` (başka markanın
ekran görüntüsü), kökteki OBJ/MTL/GLB/PNG kopyaları (kullanılanlar `src/assets` içinde).
Eşitlemeden sonra dosyaları hash ile karşılaştır ve `site_taslak/index.html`'i çift tıklama
yoluyla test et.

## 6. Değişiklik kaydı

### 2026-10-08 — İlk site
- Vite projesi kuruldu; hero (logo, menü, 3D şişe, giriş animasyonu), parça rafı, sabitlenen
  hikâye bölümü (4 bölüm), koyu "Şişe. Yakından bakın." bölümü (5 kadraj, sürükleyerek
  çevirme), koku profili kartları, döngü bölümü, footer.
- Logo `echoes_label_texture.png`'den ölçülerek SVG amblem olarak çizildi.
- GLB modele PBR materyaller (amber transmission cam, altın bilezik, mat siyah kapak),
  etiket sarma, kapak düzeltmesi; WebGL yoksa etiket görseli yedeği.

### 2026-10-08 — Çift tıklamada stilsiz görünme
- Sorun: `index.html` çift tıklanınca (file://) CSS/JS/model yüklenmiyordu.
- Çözüm: tek dosyalık derleme (her şey gömülü).

### 2026-10-08 — Yükleme ekranı %0'da takılı
- Sorun: statik sunucudan (GitHub Pages / Live Server) açılınca derlenmemiş kaynak yükleniyordu.
- Çözüm: güvenlik ağı (8 sn sonra yükleme ekranı kalkar), başlatma hatasında sayfa yine açılır.

### 2026-10-09 — Çok ürünlü e-ticaret
- Tek ürünün nota kartları ana sayfadan kaldırıldı; yerine 8 ürünlük koleksiyon rafı ve
  Kadın/Erkek kategori girişleri.
- Katalog (`src/data/products.js`): Kadın — Echo No. 01 (3D), Silent Bloom, Velvet Trace,
  Salt Letters; Erkek — Afterglow (3D), Paper Moon, Night Archive, Rain Theory.
  Tüm ticari bilgiler örnek veri.
- Yeni sayfalar: kategori (sıralama), ürün detayı (3D/görsel, adet, ara toplam, Sepete Ekle,
  stok, notalar, benzer ürünler), sepet (localStorage), bulunamadı sayfası.
- Menü: Kadın/Erkek Parfümleri, Koleksiyon, Hikâye, İletişim, sayaçlı sepet simgesi.
- Yeni OBJ modeli yüklendi (MTL renkleri, ayna logo düzeltmesi, yarı saydam sıvı).
- Kökteki `index.html` artık üretilmiş tek dosyalık site; kaynak `src/index.html`'e taşındı,
  yönlendirme betiği ve konsoldaki `ERR_FAILED` kaydı kaldırıldı.
- Doğrulama: masaüstü 45/45, mobil 10/10, uç durumlar 13/13, ana sayfa gerileme 6/6,
  doğrudan bağlantı 2/2 — çift tıklama, statik sunucu ve dev sunucuda; konsol hatası yok.

### 2026-10-09 — Back-end ve yönetim paneli (Supabase, A seçeneği)
- Veritabanı şeması + RLS + değişiklik kaydı + fotoğraf kovası + başlangıç verisi (`supabase/`).
- Yönetim paneli (`admin.html`): giriş, ürün listesi (arama/filtre/sıralama/stok uyarıları),
  ürün formu (tüm alanlar, Türkçe fiyat, otomatik adres, nota etiketleri, fotoğraf yükleme,
  3D şişe + ton seçimi, durum, örnek veri işareti, doğrulama, kaydedilmemiş değişiklik
  uyarısı, Ctrl+S, geri al), yeni ürün, owner için silme, değişiklik geçmişi (eski → yeni).
- Demo modu (Supabase bağlanana kadar): veri tarayıcıda, sitede aynı tarayıcıda yansır;
  panelde ve sitede açık uyarı.
- Site katalogu açılışta veritabanından okur; ulaşılamazsa önbellek, o da yoksa örnek katalog.
  Yüklenen fotoğraflar kartlarda ve ürün sayfasında kullanılır; "örnek veri" notu ürün bazlı.
- Testler depoya taşındı (`tests/`, `npm test`): 13 set / 357 kontrol geçti.
- Kurulum rehberi: `supabase/KURULUM.md`.

### 2026-10-09 — "Panelde eklenen ürün sitede görünmüyor" bildirimi
- Teşhis (tarayıcıda yeniden üretildi): (1) durum seçilmeden kaydedilen yeni ürün **Taslak**
  olur ve sitede bilerek gösterilmez; (2) demo modunda panel ile site **farklı adreslerden**
  açılırsa (ör. panel file://, site GitHub Pages) veri paylaşılmaz. Aynı bilgisayar/tarayıcıda
  farklı klasörlerden açılan file:// sayfalar ise veriyi paylaşır.
- Düzeltme: üründe "Bu ürün sitede görünmüyor" uyarısı + **Yayınla ve kaydet** butonu, kayıt
  bildiriminde taslak uyarısı; demo şeridi herkese açık sitenin değişiklikleri göremeyeceğini
  açıkça söylüyor. Kalıcı çözüm: Supabase bağlantısı.
- Testler: 13 set / 369 kontrol geçti. Ders: sayfada gizli görünümler (ör. gizli ana sayfa rafı)
  aynı bağlantıyı içerebilir; görünürlük testlerinde kapsamı daralt (`[data-grid]`).

### 2026-10-09 — Supabase bağlantısı
- Kullanıcı projeyi açtı, 0001/0002/seed SQL'lerini çalıştırdı (kontrol: published | 8).
- `src/config.js`'e proje adresi + publishable anahtar yazıldı; yayın derlemesi gerçek projeye bağlı.
- Gerçek projede doğrulandı: okuma, ziyaretçi yazma reddi (42501), audit/admins gizli, fotoğraf
  kovası, giriş servisi, **çift tıklamayla (file://) açılan sitenin veritabanından okuması**.
- Testler gerçek veritabanından ayrıldı (demo test derlemesi + `test:real`).

- Yönetici hesabı: kullanıcı Authentication → Users'a kendisi ekledi (önce boştu; supabase.com
  hesabıyla proje kullanıcısı karıştırılmıştı → giriş ekranına açıklama eklendi), `admins`
  kaydı var. **Kullanıcı panele canlı modda giriş yaptığını teyit etti.**
- **Uçtan uca doğrulandı:** kullanıcı panelde bir değişikliği kaydetti ve `index.html`'de gördü;
  ardından `npm run test:real` 19/19 (site = veritabanı).

### Açık konular
- Yetkili kullanıcı yazarken veritabanı hata kodlarının Türkçe mesaja eşlenmesi (ör. 23505)
  gerçek sunucuda henüz denenmedi.
- GitHub Pages'teki yayın, yeni `index.html`/`admin.html` yüklenince veritabanından okuyacak;
  orada henüz denenmedi.
- Panelde kategori düzenleme ekranı yok (kategoriler SQL/seed ile yönetiliyor); toplu fiyat
  güncelleme ve ekip/rol yönetimi ekranı henüz yok.
- Sipariş, ödeme, fatura, KVKK, kargo: sonraki aşama (kullanıcıyla birlikte).
- 6 ürünün kendi 3D modeli/fotoğrafı yok (geçici renk varyantı görseller).
- Afterglow'un sıvısı MTL'deki haliyle çok açık; açık zeminde kremsi görünüyor
  (kullanıcı isterse koyulaştırılabilir).
- Gerçek ödeme, kargo ve sipariş altyapısı yok.
- Testler sanal tarayıcıda (SwiftShader) yapıldı; gerçek telefon/GPU'da kare hızı ölçülmedi.

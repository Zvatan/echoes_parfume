# Supabase kurulumu (yönetim panelini canlıya bağlama)

Bu adımlar bir kez yapılır. Hesap ve ödeme bilgileri **sizde** kalır; anahtarları
kimseyle (sohbet dahil) paylaşmanız gerekmez — yalnızca `src/config.js` dosyasına yazılır.

## 1. Proje oluşturma
1. https://supabase.com adresinde hesap açın ve **New project** ile bir proje oluşturun.
   - Bölge: kullanıcılarınıza yakın bir bölge (ör. Frankfurt / `eu-central-1`).
   - Veritabanı şifresini güvenli bir yere kaydedin.

## 2. Veritabanını kurma (SQL Editor)
Supabase panelinde **SQL Editor → New query**, sırasıyla şu dosyaların içeriğini yapıştırıp **Run**:
1. `supabase/migrations/0001_catalog.sql` — tablolar, kurallar, güvenlik
2. `supabase/migrations/0002_storage.sql` — ürün fotoğrafları kovası
3. `supabase/seed.sql` — mevcut 8 örnek ürün ve 2 kategori

## 3. Yönetici hesabı
1. **Authentication → Users → Add user → Create new user**: e-posta + güçlü bir şifre
   (“Auto Confirm User” işaretli).
2. **SQL Editor**'da kendi e-postanızla çalıştırın:
   ```sql
   insert into public.admins (user_id, role)
   select id, 'owner' from auth.users where email = 'SIZIN@EPOSTANIZ.com';
   ```
   `owner` ürün silebilir; ekibe ekleyeceğiniz kişiler için `'editor'` kullanın.
3. **Authentication → Providers → Email**: dışarıdan kayıt istemiyorsanız
   **“Allow new users to sign up”** seçeneğini kapatın (yönetici olmayan biri hesap açsa bile
   veritabanı kuralları yazmasına izin vermez; bu ek bir önlemdir).

## 4. Siteyi bağlama  ✓ (2026-10-09 yapıldı)
1. **Project Settings → Data API / API Keys**: `Project URL` ve **publishable** anahtarı
   (`sb_publishable_…`; eski arayüzde “anon public”) kopyalayın.
2. `src/config.js` dosyasında iki sabiti doldurun:
   ```js
   const PROJECT_URL = 'https://xxxxxxxx.supabase.co';
   const PUBLISHABLE_KEY = 'sb_publishable_...';
   ```
   **Secret anahtarı (`sb_secret_…`, eski adıyla `service_role`) asla buraya yazmayın.**
3. `npm run build` → kökteki `index.html` (site) ve `admin.html` (panel) yeniden oluşur.
4. `npm run test:real` → gerçek projeye karşı okuma ve yetki kontrolleri (veri değiştirmez).

## 5. Kontrol
- `admin.html` → giriş ekranı açılmalı; giriş sonrası üst köşede **CANLI** yazmalı.
- Panelde bir fiyatı değiştirip kaydedin → `index.html`'i yenileyin → yeni fiyat görünmeli.
- Demo modunda yaptığınız değişiklikler canlıya **taşınmaz** (yalnızca o tarayıcıdaydı).

## Bilinmesi gerekenler
- Ziyaretçiler yalnızca **Yayında** durumundaki ürünleri görür; taslak ve arşiv gizlidir.
- Her değişiklik **Değişiklik geçmişi**'ne kim/ne zaman/eski–yeni değer olarak yazılır.
- Site, veritabanına ulaşamazsa son başarılı kataloğu, o da yoksa koddaki örnek kataloğu gösterir.
- Yedekleme: Planlara göre yedekleme kapsamı farklıdır ve değişebilir; projeyi canlıya almadan
  önce Supabase'in güncel plan sayfasından ve **Database → Backups** bölümünden kontrol edin.

-- ECHOES — katalog şeması
-- Supabase SQL Editor'da bir kez çalıştırılır (sonra 0002_storage.sql ve seed.sql).
--
-- Güvenlik modeli (Row Level Security):
--   • Ziyaretçi (anon) ve giriş yapmış herkes: yalnızca YAYINDAKİ ürünleri ve kategorileri okur.
--   • Yönetici (public.admins tablosunda kaydı olan kullanıcı): okur ve yazar.
--   • Değişiklik kaydı (audit_log) yalnızca tetikleyiciyle yazılır; elle yazılamaz.
-- Kurallar veritabanında tanımlıdır; tarayıcıdaki kod değiştirilse bile aşılamaz.

-- ---------------------------------------------------------------------------
-- Tablolar
-- ---------------------------------------------------------------------------

create type public.product_status as enum ('draft', 'published', 'archived');

create table public.categories (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null check (char_length(title) between 1 and 80),
  short_title text not null check (char_length(short_title) between 1 and 40),
  intro       text not null default '' check (char_length(intro) <= 300),
  sort_order  integer not null default 0,
  updated_at  timestamptz not null default now()
);

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  -- Sitedeki adres: #/urun/<slug>
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name              text not null check (char_length(btrim(name)) between 1 and 80),
  category_id       text not null references public.categories (id) on update cascade,
  status            public.product_status not null default 'draft',
  -- Fiyat kuruş cinsinden tam sayı (2.850,00 TL = 285000): ondalık yuvarlama hatası olmaz.
  price_kurus       integer not null check (price_kurus >= 0 and price_kurus <= 100000000),
  currency          char(3) not null default 'TRY',
  volume_ml         integer not null check (volume_ml between 1 and 1000),
  concentration     text not null default 'Eau de Parfum' check (char_length(concentration) <= 40),
  short_description text not null default '' check (char_length(short_description) <= 160),
  description       text not null default '' check (char_length(description) <= 2000),
  notes_top         text[] not null default '{}' check (cardinality(notes_top) <= 8),
  notes_heart       text[] not null default '{}' check (cardinality(notes_heart) <= 8),
  notes_base        text[] not null default '{}' check (cardinality(notes_base) <= 8),
  character         text not null default '' check (char_length(character) <= 60),
  longevity         text not null default '' check (char_length(longevity) <= 60),
  usage             text not null default '' check (char_length(usage) <= 200),
  stock             integer not null default 0 check (stock >= 0 and stock <= 100000),
  -- 3D görsel: {"model": "amber" | "clear", "glass": "#rrggbb", "liquid": "#rrggbb", "placeholder": bool}
  visual            jsonb not null default '{}'::jsonb check (jsonb_typeof(visual) = 'object'),
  -- Yüklenen ürün fotoğrafı: storage "product-images" kovasındaki yol
  image_path        text check (image_path is null or char_length(image_path) <= 300),
  -- Örnek (geçici) veri mi? Sitede "örnek veri" notu bu alana göre gösterilir.
  is_sample         boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        uuid references auth.users (id) on delete set null
);

create index products_listing_idx on public.products (category_id, status, sort_order);

-- Yöneticiler: Supabase Auth kullanıcısını yönetici yapar.
-- Kayıt yalnızca SQL Editor'dan eklenir (bkz. supabase/KURULUM.md); API ile eklenemez.
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id         bigint generated always as identity primary key,
  table_name text not null,
  record_id  text not null,
  action     text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  old_data   jsonb,
  new_data   jsonb
);

create index audit_log_recent_idx on public.audit_log (changed_at desc);

-- ---------------------------------------------------------------------------
-- Yardımcı fonksiyonlar ve tetikleyiciler
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and role = 'owner');
$$;

create or replace function public.touch_product()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Her ekleme/güncelleme/silme audit_log'a eski ve yeni haliyle yazılır.
create or replace function public.write_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec_id text;
begin
  if tg_op = 'DELETE' then
    rec_id := (to_jsonb(old) ->> 'id');
  else
    rec_id := (to_jsonb(new) ->> 'id');
  end if;

  insert into public.audit_log (table_name, record_id, action, changed_by, old_data, new_data)
  values (
    tg_table_name,
    coalesce(rec_id, ''),
    lower(tg_op),
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger products_touch before insert or update on public.products
  for each row execute function public.touch_product();
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

create trigger products_audit after insert or update or delete on public.products
  for each row execute function public.write_audit();
create trigger categories_audit after insert or update or delete on public.categories
  for each row execute function public.write_audit();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.admins     enable row level security;
alter table public.audit_log  enable row level security;

-- Kategoriler: herkes okur, yöneticiler yazar.
create policy categories_read on public.categories
  for select using (true);
create policy categories_admin_insert on public.categories
  for insert with check (public.is_admin());
create policy categories_admin_update on public.categories
  for update using (public.is_admin()) with check (public.is_admin());
create policy categories_owner_delete on public.categories
  for delete using (public.is_owner());

-- Ürünler: herkes yalnızca yayındakileri okur; yöneticiler hepsini okur ve yazar.
-- Silme yalnızca "owner" rolünde; günlük kullanımda ürünler "archived" yapılır.
create policy products_read on public.products
  for select using (status = 'published' or public.is_admin());
create policy products_admin_insert on public.products
  for insert with check (public.is_admin());
create policy products_admin_update on public.products
  for update using (public.is_admin()) with check (public.is_admin());
create policy products_owner_delete on public.products
  for delete using (public.is_owner());

-- Yöneticiler tablosu: kullanıcı yalnızca kendi kaydını görür; API ile yazılamaz.
create policy admins_read_self on public.admins
  for select using (user_id = auth.uid() or public.is_owner());

-- Değişiklik kaydı: yalnızca yöneticiler okur; yazma politikası yok (tetikleyici yazar).
create policy audit_admin_read on public.audit_log
  for select using (public.is_admin());

-- Ziyaretçi rolünün yazma yetkisini tablo düzeyinde de kaldır (iki kat koruma).
revoke insert, update, delete on public.categories, public.products, public.admins, public.audit_log from anon;
revoke insert, update, delete on public.admins, public.audit_log from authenticated;

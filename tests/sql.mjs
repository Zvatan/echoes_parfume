import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const P = new URL('../supabase/', import.meta.url);
const db = new PGlite();
let fail = 0;
const check = (l, ok, x = '') => { if (!ok) fail++; console.log(`${ok ? '✓' : '✗'} ${l}${!ok && x ? ` → ${x}` : ''}`); };

// --- Supabase ortamının taklidi ---------------------------------------------
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant all on storage.objects to anon, authenticated;
  insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c');
`);
const OWNER = '00000000-0000-0000-0000-00000000000a';
const EDITOR = '00000000-0000-0000-0000-00000000000b';
const USER = '00000000-0000-0000-0000-00000000000c';

for (const f of ['migrations/0001_catalog.sql', 'migrations/0002_storage.sql', 'seed.sql']) {
  try {
    await db.exec(readFileSync(new URL(f, P), 'utf8'));
    check(`${f} uygulandı`, true);
  } catch (e) {
    check(`${f} uygulandı`, false, e.message);
  }
}
// seed iki kez çalışabilmeli (idempotent)
try { await db.exec(readFileSync(new URL('seed.sql', P), 'utf8')); check('seed.sql tekrar çalıştırılabilir', true); } catch (e) { check('seed.sql tekrar çalıştırılabilir', false, e.message); }

await db.exec(`insert into public.admins (user_id, role) values ('${OWNER}', 'owner'), ('${EDITOR}', 'editor');`);

// Rol değiştirerek sorgu
async function as(who, sql, params = []) {
  const sub = { anon: '', owner: OWNER, editor: EDITOR, user: USER }[who];
  const role = who === 'anon' ? 'anon' : 'authenticated';
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub}', false); set role ${role};`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role;');
  }
}
async function fails(who, sql) {
  try { await as(who, sql); return null; } catch (e) { return e.message; }
}
const one = async (who, sql) => (await as(who, sql)).rows[0];

// --- Okuma ------------------------------------------------------------------
check('ziyaretçi 8 yayındaki ürünü görür', (await one('anon', 'select count(*)::int n from products')).n === 8);
await db.exec(`update products set status = 'draft' where slug = 'rain-theory';`);
check('ziyaretçi taslağı görmez (7)', (await one('anon', 'select count(*)::int n from products')).n === 7);
check('yetkisiz kullanıcı taslağı görmez (7)', (await one('user', 'select count(*)::int n from products')).n === 7);
check('editör taslağı görür (8)', (await one('editor', 'select count(*)::int n from products')).n === 8);
check('ziyaretçi kategorileri okur', (await one('anon', 'select count(*)::int n from categories')).n === 2);
check('is_admin(): ziyaretçi false, editör true', (await one('anon', 'select is_admin() a')).a === false && (await one('editor', 'select is_admin() a')).a === true);

// --- Yazma ------------------------------------------------------------------
check('ziyaretçi fiyat değiştiremez (yetki hatası)', !!(await fails('anon', `update products set price_kurus = 1 where slug = 'echo-no-01'`)));
await as('user', `update products set price_kurus = 1 where slug = 'echo-no-01'`);
check('yetkisiz kullanıcı fiyat değiştiremez', (await one('anon', `select price_kurus p from products where slug='echo-no-01'`)).p === 285000);
await as('editor', `update products set price_kurus = 310000 where slug = 'echo-no-01'`);
const echo = await one('editor', `select price_kurus, updated_by, updated_at > created_at as touched from products where slug='echo-no-01'`);
check('editör fiyatı günceller', echo.price_kurus === 310000);
check('updated_by = düzenleyen editör', echo.updated_by === EDITOR);
const audit = await one('editor', `select action, changed_by, (old_data->>'price_kurus')::int o, (new_data->>'price_kurus')::int n from audit_log where record_id = (select id::text from products where slug='echo-no-01') order by id desc limit 1`);
check('değişiklik kaydı: eski/yeni fiyat ve kim', audit?.action === 'update' && audit.changed_by === EDITOR && audit.o === 285000 && audit.n === 310000, JSON.stringify(audit));
check('yetkisiz kullanıcı değişiklik kaydını göremez', (await one('user', 'select count(*)::int n from audit_log')).n === 0);
check('editör değişiklik kaydını görür', (await one('editor', 'select count(*)::int n from audit_log')).n > 0);
check('değişiklik kaydına elle yazılamaz', !!(await fails('editor', `insert into audit_log (table_name, record_id, action) values ('x','1','update')`)));
check('kendini yönetici yapamaz (yetki yükseltme)', !!(await fails('user', `insert into admins (user_id, role) values ('${USER}', 'owner')`)));
check('editör kendini owner yapamaz', !!(await fails('editor', `update admins set role = 'owner' where user_id = '${EDITOR}'`)));

// --- Veri kuralları ------------------------------------------------------------
const base = `insert into products (slug, name, category_id, price_kurus, volume_ml) values`;
check('negatif fiyat reddedilir', !!(await fails('editor', `${base} ('test-a', 'Test', 'kadin', -100, 50)`)));
check('geçersiz adres (slug) reddedilir', !!(await fails('editor', `${base} ('Geçersiz Adres', 'Test', 'kadin', 100, 50)`)));
check('boş ad reddedilir', !!(await fails('editor', `${base} ('test-b', '   ', 'kadin', 100, 50)`)));
check('olmayan kategori reddedilir', !!(await fails('editor', `${base} ('test-c', 'Test', 'unisex', 100, 50)`)));
check('aynı adres ikinci kez kullanılamaz', !!(await fails('editor', `${base} ('echo-no-01', 'Kopya', 'kadin', 100, 50)`)));
check('negatif stok reddedilir', !!(await fails('editor', `update products set stock = -1 where slug='afterglow'`)));
check('editör yeni ürün ekler (taslak)', !(await fails('editor', `${base} ('yeni-urun', 'Yeni Ürün', 'erkek', 199900, 100)`)));
check('yeni ürün varsayılan olarak taslak, ziyaretçi görmez', (await one('anon', `select count(*)::int n from products where slug='yeni-urun'`)).n === 0);

// --- Silme ------------------------------------------------------------------
await as('editor', `delete from products where slug = 'yeni-urun'`);
check('editör ürün silemez (yalnızca owner)', (await one('owner', `select count(*)::int n from products where slug='yeni-urun'`)).n === 1);
await as('owner', `delete from products where slug = 'yeni-urun'`);
check('owner ürün silebilir', (await one('owner', `select count(*)::int n from products where slug='yeni-urun'`)).n === 0);
check('silme de kayda geçer', (await one('owner', `select count(*)::int n from audit_log where action='delete'`)).n === 1);

// --- Depolama ------------------------------------------------------------------
check('editör fotoğraf yükleyebilir', !(await fails('editor', `insert into storage.objects (bucket_id, name) values ('product-images', 'echo-no-01/a.webp')`)));
check('yetkisiz kullanıcı fotoğraf yükleyemez', !!(await fails('user', `insert into storage.objects (bucket_id, name) values ('product-images', 'x.webp')`)));
check('ziyaretçi fotoğrafları görebilir', (await one('anon', `select count(*)::int n from storage.objects where bucket_id='product-images'`)).n === 1);

console.log(fail ? `\n${fail} SQL TESTİ BAŞARISIZ` : '\nTüm SQL testleri geçti');
process.exit(fail ? 1 : 0);

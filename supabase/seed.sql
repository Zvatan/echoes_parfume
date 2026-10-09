-- ECHOES — başlangıç verisi (scripts/generate-seed.mjs ile üretildi; elle düzenlemeyin)
-- Tüm ürünler ÖRNEK veridir (is_sample = true). Tekrar çalıştırmak mevcut kayıtları günceller.

insert into public.categories (id, title, short_title, intro, sort_order) values ('kadin', 'Kadın Parfümleri', 'Kadın', 'Amberden yeşile, deriden tuza. Her biri başka bir iz bırakan kadın parfümleri.', 0)
  on conflict (id) do update set title = excluded.title, short_title = excluded.short_title, intro = excluded.intro, sort_order = excluded.sort_order;
insert into public.categories (id, title, short_title, intro, sort_order) values ('erkek', 'Erkek Parfümleri', 'Erkek', 'Narenciyeden irise, tütsüden yağmura. Sessiz ama akılda kalan erkek parfümleri.', 1)
  on conflict (id) do update set title = excluded.title, short_title = excluded.short_title, intro = excluded.intro, sort_order = excluded.sort_order;

insert into public.products (slug, name, category_id, status, price_kurus, volume_ml, concentration, short_description, description,
  notes_top, notes_heart, notes_base, character, longevity, usage, stock, visual, is_sample, sort_order)
values ('echo-no-01', 'Echo No. 01', 'kadin', 'published', 285000, 50, 'Eau de Parfum', 'Sıcak amber ve pembe biberle açılan imza koku.', 'ECHOES’un ilk sesi. Pembe biberin kısa parıltısı, iris ve tütsüyle yumuşar; tende amber ve sandal ağacının sıcak izi kalır.',
  array['Pembe biber', 'Bergamot', 'Kakule']::text[], array['İris', 'Tütsü', 'Gül']::text[], array['Amber', 'Sandal ağacı', 'Vanilya']::text[], 'Amber · Baharatlı', 'Uzun kalıcı (8+ saat)', 'Akşam ve serin günler için. Nabız noktalarına 2–3 sıkım.', 12, '{"model":"amber","placeholder":false}'::jsonb, true, 0)
on conflict (slug) do update set name = excluded.name, category_id = excluded.category_id, price_kurus = excluded.price_kurus,
  volume_ml = excluded.volume_ml, concentration = excluded.concentration, short_description = excluded.short_description,
  description = excluded.description, notes_top = excluded.notes_top, notes_heart = excluded.notes_heart, notes_base = excluded.notes_base,
  character = excluded.character, longevity = excluded.longevity, usage = excluded.usage, stock = excluded.stock,
  visual = excluded.visual, sort_order = excluded.sort_order;

insert into public.products (slug, name, category_id, status, price_kurus, volume_ml, concentration, short_description, description,
  notes_top, notes_heart, notes_base, character, longevity, usage, stock, visual, is_sample, sort_order)
values ('silent-bloom', 'Silent Bloom', 'kadin', 'published', 245000, 50, 'Eau de Parfum', 'Yağmurdan sonra kesilmiş yeşil saplar ve nergis.', 'Çiçeğin kendisinden çok, çevresindeki havayı anlatır. Galbanumun yeşil keskinliği nergisle açılır, yosun ve beyaz misk sessizce yerleşir.',
  array['Galbanum', 'Armut yaprağı']::text[], array['Nergis', 'Vadi zambağı', 'Yasemin çayı']::text[], array['Meşe yosunu', 'Beyaz misk']::text[], 'Yeşil · Çiçeksi', 'Orta kalıcı (5–6 saat)', 'Gündüz ve ilkbahar için. Bileklere ve boyna hafifçe.', 9, '{"model":"amber","glass":"#c5cfb2","liquid":"#b9c79a","placeholder":true}'::jsonb, true, 1)
on conflict (slug) do update set name = excluded.name, category_id = excluded.category_id, price_kurus = excluded.price_kurus,
  volume_ml = excluded.volume_ml, concentration = excluded.concentration, short_description = excluded.short_description,
  description = excluded.description, notes_top = excluded.notes_top, notes_heart = excluded.notes_heart, notes_base = excluded.notes_base,
  character = excluded.character, longevity = excluded.longevity, usage = excluded.usage, stock = excluded.stock,
  visual = excluded.visual, sort_order = excluded.sort_order;

insert into public.products (slug, name, category_id, status, price_kurus, volume_ml, concentration, short_description, description,
  notes_top, notes_heart, notes_base, character, longevity, usage, stock, visual, is_sample, sort_order)
values ('velvet-trace', 'Velvet Trace', 'kadin', 'published', 335000, 100, 'Extrait de Parfum', 'Safranla ısıtılmış yumuşak deri.', 'Kadife bir eldivenin içi gibi: safran ve ahududu ile parlayan, süet deri ve oud ile derinleşen yoğun bir koku.',
  array['Safran', 'Ahududu']::text[], array['Süet deri', 'Menekşe yaprağı']::text[], array['Oud', 'Labdanum', 'Kaşmir ağacı']::text[], 'Deri · Odunsu', 'Çok uzun kalıcı (10+ saat)', 'Az miktar yeterli. Tek sıkım, göğüs hizasına.', 4, '{"model":"amber","glass":"#9a5a63","liquid":"#7a2f3b","placeholder":true}'::jsonb, true, 2)
on conflict (slug) do update set name = excluded.name, category_id = excluded.category_id, price_kurus = excluded.price_kurus,
  volume_ml = excluded.volume_ml, concentration = excluded.concentration, short_description = excluded.short_description,
  description = excluded.description, notes_top = excluded.notes_top, notes_heart = excluded.notes_heart, notes_base = excluded.notes_base,
  character = excluded.character, longevity = excluded.longevity, usage = excluded.usage, stock = excluded.stock,
  visual = excluded.visual, sort_order = excluded.sort_order;

insert into public.products (slug, name, category_id, status, price_kurus, volume_ml, concentration, short_description, description,
  notes_top, notes_heart, notes_base, character, longevity, usage, stock, visual, is_sample, sort_order)
values ('salt-letters', 'Salt Letters', 'kadin', 'published', 225000, 50, 'Eau de Toilette', 'Deniz tuzu, sıcak taş ve kuruyan mürekkep.', 'Sahilde unutulmuş bir mektup. Deniz tuzu ve ambrette tohumunun mineral tazeliği, sedirin kuru sıcaklığıyla buluşur.',
  array['Deniz tuzu', 'Greyfurt']::text[], array['Ambrette tohumu', 'Adaçayı']::text[], array['Sedir', 'Ambergris akoru']::text[], 'Mineral · Ferah', 'Hafif–orta kalıcı (4–5 saat)', 'Sıcak günler için. Gün içinde tazelenebilir.', 15, '{"model":"amber","glass":"#b9cbd4","liquid":"#9fc0cc","placeholder":true}'::jsonb, true, 3)
on conflict (slug) do update set name = excluded.name, category_id = excluded.category_id, price_kurus = excluded.price_kurus,
  volume_ml = excluded.volume_ml, concentration = excluded.concentration, short_description = excluded.short_description,
  description = excluded.description, notes_top = excluded.notes_top, notes_heart = excluded.notes_heart, notes_base = excluded.notes_base,
  character = excluded.character, longevity = excluded.longevity, usage = excluded.usage, stock = excluded.stock,
  visual = excluded.visual, sort_order = excluded.sort_order;

insert into public.products (slug, name, category_id, status, price_kurus, volume_ml, concentration, short_description, description,
  notes_top, notes_heart, notes_base, character, longevity, usage, stock, visual, is_sample, sort_order)
values ('afterglow', 'Afterglow', 'erkek', 'published', 295000, 100, 'Eau de Parfum', 'Gün batımından sonra kalan ışık: narenciye ve beyaz misk.', 'Yuzu ve neroli ile aydınlık açılır, sıcak tenin hemen üstünde kalan beyaz misk ve ambrox ile uzun süre parlamaya devam eder.',
  array['Yuzu', 'Neroli', 'Zencefil']::text[], array['Portakal çiçeği', 'Biber yaprağı']::text[], array['Beyaz misk', 'Ambrox', 'Vetiver']::text[], 'Narenciye · Misk', 'Uzun kalıcı (7–8 saat)', 'Her mevsim, gündüzden akşama. Boyun ve bileklere 2 sıkım.', 10, '{"model":"clear","placeholder":false}'::jsonb, true, 4)
on conflict (slug) do update set name = excluded.name, category_id = excluded.category_id, price_kurus = excluded.price_kurus,
  volume_ml = excluded.volume_ml, concentration = excluded.concentration, short_description = excluded.short_description,
  description = excluded.description, notes_top = excluded.notes_top, notes_heart = excluded.notes_heart, notes_base = excluded.notes_base,
  character = excluded.character, longevity = excluded.longevity, usage = excluded.usage, stock = excluded.stock,
  visual = excluded.visual, sort_order = excluded.sort_order;

insert into public.products (slug, name, category_id, status, price_kurus, volume_ml, concentration, short_description, description,
  notes_top, notes_heart, notes_base, character, longevity, usage, stock, visual, is_sample, sort_order)
values ('paper-moon', 'Paper Moon', 'erkek', 'published', 265000, 50, 'Eau de Parfum', 'Pudralı iris ve eski kâğıt.', 'Klişelerden uzak, sakin bir erkek kokusu. İris kökü ve havuç tohumunun pudralı dokusu, papirüs ve tonka ile sıcak bir kâğıt hissine döner.',
  array['Havuç tohumu', 'Kişniş']::text[], array['İris kökü', 'Papirüs']::text[], array['Tonka', 'Kaşmir ağacı', 'Misk']::text[], 'Pudralı · İris', 'Orta–uzun kalıcı (6–7 saat)', 'Ofis ve gündüz için. Ten üzerinde yakından duyulur.', 7, '{"model":"clear","liquid":"#d9cbe0","placeholder":true}'::jsonb, true, 5)
on conflict (slug) do update set name = excluded.name, category_id = excluded.category_id, price_kurus = excluded.price_kurus,
  volume_ml = excluded.volume_ml, concentration = excluded.concentration, short_description = excluded.short_description,
  description = excluded.description, notes_top = excluded.notes_top, notes_heart = excluded.notes_heart, notes_base = excluded.notes_base,
  character = excluded.character, longevity = excluded.longevity, usage = excluded.usage, stock = excluded.stock,
  visual = excluded.visual, sort_order = excluded.sort_order;

insert into public.products (slug, name, category_id, status, price_kurus, volume_ml, concentration, short_description, description,
  notes_top, notes_heart, notes_base, character, longevity, usage, stock, visual, is_sample, sort_order)
values ('night-archive', 'Night Archive', 'erkek', 'published', 320000, 100, 'Extrait de Parfum', 'Tütsü, kakao ve ağır ahşap raflar.', 'Gece kapanmış bir arşiv odası. Siyah biber ve tütsü dumanı, kakao ve labdanumun koyu tatlılığıyla birleşir.',
  array['Siyah biber', 'Elemi']::text[], array['Tütsü', 'Kakao']::text[], array['Labdanum', 'Guaiac ağacı', 'Paçuli']::text[], 'Tütsü · Reçineli', 'Çok uzun kalıcı (10+ saat)', 'Akşam ve kış için. Tek sıkım yeterli.', 3, '{"model":"clear","liquid":"#5b3a24","placeholder":true}'::jsonb, true, 6)
on conflict (slug) do update set name = excluded.name, category_id = excluded.category_id, price_kurus = excluded.price_kurus,
  volume_ml = excluded.volume_ml, concentration = excluded.concentration, short_description = excluded.short_description,
  description = excluded.description, notes_top = excluded.notes_top, notes_heart = excluded.notes_heart, notes_base = excluded.notes_base,
  character = excluded.character, longevity = excluded.longevity, usage = excluded.usage, stock = excluded.stock,
  visual = excluded.visual, sort_order = excluded.sort_order;

insert into public.products (slug, name, category_id, status, price_kurus, volume_ml, concentration, short_description, description,
  notes_top, notes_heart, notes_base, character, longevity, usage, stock, visual, is_sample, sort_order)
values ('rain-theory', 'Rain Theory', 'erkek', 'published', 235000, 50, 'Eau de Toilette', 'Islak taş, incir yaprağı ve vetiver.', 'Yaz yağmurunun ilk dakikası. Ozonik bir açılış incir yaprağının sütlü yeşiline, oradan da topraksı vetivere iner.',
  array['Yağmur akoru', 'Limon kabuğu']::text[], array['İncir yaprağı', 'Nane']::text[], array['Vetiver', 'Islak taş akoru']::text[], 'Yeşil · Ozonik', 'Orta kalıcı (4–6 saat)', 'Sıcak ve nemli günler için. Gün içinde tazelenebilir.', 14, '{"model":"clear","liquid":"#a9c4ae","placeholder":true}'::jsonb, true, 7)
on conflict (slug) do update set name = excluded.name, category_id = excluded.category_id, price_kurus = excluded.price_kurus,
  volume_ml = excluded.volume_ml, concentration = excluded.concentration, short_description = excluded.short_description,
  description = excluded.description, notes_top = excluded.notes_top, notes_heart = excluded.notes_heart, notes_base = excluded.notes_base,
  character = excluded.character, longevity = excluded.longevity, usage = excluded.usage, stock = excluded.stock,
  visual = excluded.visual, sort_order = excluded.sort_order;

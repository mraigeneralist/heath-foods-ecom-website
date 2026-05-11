-- =============================================================
-- Sattva — Healthy Food E-commerce — Schema, RLS, Seed
-- Run this entire file once in the Supabase SQL Editor.
-- Re-running is mostly safe: schema uses IF NOT EXISTS / OR REPLACE
-- and seed data uses ON CONFLICT.
-- =============================================================

-- ----- Extensions -----
create extension if not exists "pgcrypto" with schema "public";

-- ----- Profiles -----
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth.user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by RLS policies
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ----- Categories -----
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  image_url text,
  sort_order int not null default 0
);

-- ----- Products -----
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  slug text unique not null,
  name text not null,
  description text,
  price_paise int not null check (price_paise >= 0),
  weight_grams int,
  stock int not null default 100 check (stock >= 0),
  image_url text,
  gallery_image_urls text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Idempotent: also add the gallery column to a previously-created table
alter table public.products
  add column if not exists gallery_image_urls text[] not null default '{}';

-- ----- Addresses -----
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  recipient_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  is_default boolean not null default false
);

-- ----- Orders -----
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  razorpay_order_id text unique,
  razorpay_payment_id text,
  razorpay_signature text,
  status text not null default 'created'
    check (status in ('created','paid','shipped','delivered','cancelled','failed')),
  subtotal_paise int not null,
  shipping_paise int not null default 0,
  total_paise int not null,
  address_snapshot jsonb not null,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- ----- Order items -----
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name_snapshot text not null,
  price_paise_snapshot int not null,
  quantity int not null check (quantity > 0)
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Drop-and-recreate so re-running is idempotent
drop policy if exists "profiles self read" on public.profiles;
drop policy if exists "profiles admin read all" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;

create policy "profiles self read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles admin read all"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles self update"
  on public.profiles for update
  using (auth.uid() = id);

-- Categories: public read, admin write
drop policy if exists "categories public read" on public.categories;
drop policy if exists "categories admin write" on public.categories;
create policy "categories public read"
  on public.categories for select
  using (true);
create policy "categories admin write"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- Products: public read (active OR admin), admin write
drop policy if exists "products public read" on public.products;
drop policy if exists "products admin all" on public.products;
create policy "products public read"
  on public.products for select
  using (is_active = true or public.is_admin());
create policy "products admin all"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- Addresses: only the owner
drop policy if exists "addresses owner all" on public.addresses;
create policy "addresses owner all"
  on public.addresses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Orders: customer reads own, admin reads all, admin can update status
drop policy if exists "orders read own or admin" on public.orders;
drop policy if exists "orders admin update" on public.orders;
create policy "orders read own or admin"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());
create policy "orders admin update"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

-- Order items: same visibility as parent order; reads only.
drop policy if exists "order_items read own or admin" on public.order_items;
create policy "order_items read own or admin"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

-- Note: order/order_item INSERTs are performed by the server route using the
-- service-role key, which bypasses RLS. No insert policy is required.

-- =============================================================
-- Storage: product-images bucket policies
-- IMPORTANT: First create the bucket via Supabase Dashboard:
--   Storage → "New bucket" → name: product-images, public: ON
-- Then run the policies below.
-- =============================================================
drop policy if exists "product-images public read" on storage.objects;
drop policy if exists "product-images admin insert" on storage.objects;
drop policy if exists "product-images admin update" on storage.objects;
drop policy if exists "product-images admin delete" on storage.objects;

create policy "product-images public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product-images admin insert"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product-images admin update"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product-images admin delete"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());

-- =============================================================
-- Seed data: 3 categories x 5 products
-- Re-runnable thanks to ON CONFLICT (slug).
-- Image URLs point at copyright-free Unsplash CDN photos.
-- Once you upload real photos via the admin, image_url is overwritten.
--
-- All text literals use dollar-quoted strings ($t$...$t$) so no
-- apostrophe, em-dash, or smart-quote in any clipboard or editor can
-- break them.
-- =============================================================
insert into public.categories (slug, name, description, image_url, sort_order) values
  ($t$snacks$t$, $t$Snacks$t$, $t$Wholesome munchies - roasted, baked, never fried.$t$, $t$https://images.unsplash.com/photo-1521986329282-0436c1f1e212?w=1200&q=80&auto=format&fit=crop$t$, 0),
  ($t$beverages$t$, $t$Beverages$t$, $t$Cold-pressed juices, herbal infusions, plant milks.$t$, $t$https://images.unsplash.com/photo-1504855232331-fe4d5d2febfd?w=1200&q=80&auto=format&fit=crop$t$, 1),
  ($t$superfoods$t$, $t$Superfoods$t$, $t$Nutrient-dense staples for everyday wellness.$t$, $t$https://images.unsplash.com/photo-1542990253-a781e04c0082?w=1200&q=80&auto=format&fit=crop$t$, 2)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order;

-- Snacks
insert into public.products (category_id, slug, name, description, price_paise, weight_grams, stock, image_url, gallery_image_urls) values
  ((select id from public.categories where slug = $t$snacks$t$), $t$roasted-makhana$t$, $t$Roasted Makhana$t$,
    $t$Lightly salted fox-nuts roasted in a touch of cold-pressed coconut oil. Crisp, addictive, and just 90 calories a handful.$t$,
    24900, 100, 80,
    $t$https://images.unsplash.com/photo-1710421576768-ff985fa63b60?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1776765828683-eb5ec29711e2?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1662716679940-14b4669aa1be?w=1200&q=80&auto=format&fit=crop$t$
    ]),
  ((select id from public.categories where slug = $t$snacks$t$), $t$baked-ragi-chips$t$, $t$Baked Ragi Chips$t$,
    $t$Stone-ground ragi flour, baked twice for that satisfying crunch. Iron-rich and gluten-conscious.$t$,
    17900, 80, 80,
    $t$https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1617102738820-bee2545405fd?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1647764430080-6000fbe7efee?w=1200&q=80&auto=format&fit=crop$t$
    ]),
  ((select id from public.categories where slug = $t$snacks$t$), $t$almond-energy-bars$t$, $t$Almond Energy Bars (pack of 6)$t$,
    $t$California almonds, dates, and a whisper of jaggery. No refined sugar, no protein-bar aftertaste.$t$,
    39900, null, 60,
    $t$https://images.unsplash.com/photo-1772985432516-2e2ed6e4d480?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1772985197848-f927e66ed318?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1558022237-9acacfbea28d?w=1200&q=80&auto=format&fit=crop$t$
    ]),
  ((select id from public.categories where slug = $t$snacks$t$), $t$quinoa-puff-mix$t$, $t$Quinoa Puff Mix$t$,
    $t$Air-puffed quinoa with curry leaves, peanuts and a streak of chilli. Office-drawer-approved.$t$,
    22900, 150, 70,
    $t$https://images.unsplash.com/photo-1705925438840-86614d4f7155?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1642254964005-c2b1a6871cec?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1741827866505-11eb7c6926e0?w=1200&q=80&auto=format&fit=crop$t$
    ]),
  ((select id from public.categories where slug = $t$snacks$t$), $t$multigrain-khakhra$t$, $t$Multigrain Khakhra$t$,
    $t$Hand-rolled, slow-roasted Gujarati khakhra with bajra, jowar and methi. As tea-time should be.$t$,
    14900, 200, 100,
    $t$https://images.unsplash.com/photo-1588988949118-c86ba9c9c225?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1640625314547-aee9a7696589?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1521791697570-e1f13d0b81d0?w=1200&q=80&auto=format&fit=crop$t$
    ])
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price_paise = excluded.price_paise,
  weight_grams = excluded.weight_grams,
  image_url = excluded.image_url,
  gallery_image_urls = excluded.gallery_image_urls,
  category_id = excluded.category_id;

-- Beverages
insert into public.products (category_id, slug, name, description, price_paise, weight_grams, stock, image_url, gallery_image_urls) values
  ((select id from public.categories where slug = $t$beverages$t$), $t$cold-pressed-amla-juice$t$, $t$Cold-Pressed Amla Juice$t$,
    $t$Single-origin amla pressed within hours of harvest. Tart, vitamin-C rich, no added sugar.$t$,
    44900, 500, 50,
    $t$https://images.unsplash.com/photo-1676043967557-2b70d9facd71?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1736959578118-a641cc0a9dd9?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1737053525761-815d4db0c05d?w=1200&q=80&auto=format&fit=crop$t$
    ]),
  ((select id from public.categories where slug = $t$beverages$t$), $t$tulsi-ginger-green-tea$t$, $t$Tulsi-Ginger Green Tea (25 bags)$t$,
    $t$High-grown Nilgiri green tea, holy basil, and bright Kerala ginger. Calm in a cup.$t$,
    32900, null, 90,
    $t$https://images.unsplash.com/photo-1555447014-7ead71574544?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1518881922778-bacb4debc3d7?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=1200&q=80&auto=format&fit=crop$t$
    ]),
  ((select id from public.categories where slug = $t$beverages$t$), $t$coconut-water-sachets$t$, $t$Coconut Water (pack of 6)$t$,
    $t$Tender coconut water from the Konkan coast, lightly chilled and ready to drink.$t$,
    29900, null, 70,
    $t$https://images.unsplash.com/photo-1588413336019-dd5d3beddf55?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1537191072641-5e19cc173c6a?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1628692945318-f44a3c346afb?w=1200&q=80&auto=format&fit=crop$t$
    ]),
  ((select id from public.categories where slug = $t$beverages$t$), $t$almond-milk-unsweetened$t$, $t$Almond Milk - Unsweetened$t$,
    $t$Just two ingredients: almonds and water. No gums, no thickeners.$t$,
    27900, 1000, 60,
    $t$https://images.unsplash.com/photo-1601436423474-51738541c1b1?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1626196340104-2d6769a08761?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1680901106907-3374ffaa25c6?w=1200&q=80&auto=format&fit=crop$t$
    ]),
  ((select id from public.categories where slug = $t$beverages$t$), $t$beetroot-carrot-shot$t$, $t$Beetroot-Carrot Wellness Shot (6 x 60 ml)$t$,
    $t$A daily-dose ritual: beetroot, carrot, ginger, lemon - and nothing else.$t$,
    49900, null, 50,
    $t$https://images.unsplash.com/photo-1506802913710-40e2e66339c9?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1551040096-5f4aec6ca12b?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1500291161618-747dee2ab16c?w=1200&q=80&auto=format&fit=crop$t$
    ])
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price_paise = excluded.price_paise,
  weight_grams = excluded.weight_grams,
  image_url = excluded.image_url,
  gallery_image_urls = excluded.gallery_image_urls,
  category_id = excluded.category_id;

-- Superfoods
insert into public.products (category_id, slug, name, description, price_paise, weight_grams, stock, image_url, gallery_image_urls) values
  ((select id from public.categories where slug = $t$superfoods$t$), $t$raw-forest-honey$t$, $t$Raw Forest Honey$t$,
    $t$Wild-harvested by tribal cooperatives in the Sundarbans. Unfiltered, unheated, untouched.$t$,
    59900, 500, 60,
    $t$https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1642067958024-1a2d9f836920?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1654515722385-c684c5331c04?w=1200&q=80&auto=format&fit=crop$t$
    ]),
  ((select id from public.categories where slug = $t$superfoods$t$), $t$organic-chia-seeds$t$, $t$Organic Chia Seeds$t$,
    $t$Black chia from certified organic farms. High in omega-3s. Spoon into yogurt for a crunchy breakfast.$t$,
    34900, 250, 100,
    $t$https://images.unsplash.com/photo-1604768802835-899055f0e245?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1642497393633-a19e9231fb92?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1502825926876-e8819fbb2fd0?w=1200&q=80&auto=format&fit=crop$t$
    ]),
  ((select id from public.categories where slug = $t$superfoods$t$), $t$moringa-leaf-powder$t$, $t$Moringa Leaf Powder$t$,
    $t$Shade-dried moringa, cold-milled to retain colour and chlorophyll. A teaspoon goes a long way.$t$,
    44900, 200, 80,
    $t$https://images.unsplash.com/photo-1565117661210-fd54898de423?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1563353037-705845a4f9cc?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1650494701391-daceb922ce9d?w=1200&q=80&auto=format&fit=crop$t$
    ]),
  ((select id from public.categories where slug = $t$superfoods$t$), $t$a2-cow-ghee$t$, $t$A2 Cow Ghee$t$,
    $t$Bilona-method ghee from Gir cows raised on open pasture. Nutty, golden, ridiculous on dosa.$t$,
    89900, 500, 40,
    $t$https://images.unsplash.com/photo-1573812461383-e5f8b759d12e?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1707425197195-240b7ad69047?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1707424124274-689499bbe5e9?w=1200&q=80&auto=format&fit=crop$t$
    ]),
  ((select id from public.categories where slug = $t$superfoods$t$), $t$cold-pressed-flaxseed-oil$t$, $t$Cold-Pressed Flaxseed Oil$t$,
    $t$Pressed at low temperature in small batches to preserve omega-3s. Drizzle on salads.$t$,
    52900, 250, 50,
    $t$https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200&q=80&auto=format&fit=crop$t$,
    array[
      $t$https://images.unsplash.com/photo-1552592074-ea7a91b851b3?w=1200&q=80&auto=format&fit=crop$t$,
      $t$https://images.unsplash.com/photo-1720468750623-39e9a09f5067?w=1200&q=80&auto=format&fit=crop$t$
    ])
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price_paise = excluded.price_paise,
  weight_grams = excluded.weight_grams,
  image_url = excluded.image_url,
  gallery_image_urls = excluded.gallery_image_urls,
  category_id = excluded.category_id;

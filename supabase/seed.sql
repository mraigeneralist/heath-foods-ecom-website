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
-- Seed data — 3 categories × 5 products
-- Re-runnable thanks to ON CONFLICT (slug).
-- Image URLs point at the SVG placeholder tiles checked into /public.
-- Once you upload real photos via the admin, image_url is overwritten.
-- =============================================================
insert into public.categories (slug, name, description, image_url, sort_order) values
  ('snacks', 'Snacks', 'Wholesome munchies — roasted, baked, never fried.', '/categories/snacks.svg', 0),
  ('beverages', 'Beverages', 'Cold-pressed juices, herbal infusions, plant milks.', '/categories/beverages.svg', 1),
  ('superfoods', 'Superfoods', 'Nutrient-dense staples for everyday wellness.', '/categories/superfoods.svg', 2)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order;

-- Snacks
insert into public.products (category_id, slug, name, description, price_paise, weight_grams, stock, image_url) values
  ((select id from public.categories where slug = 'snacks'), 'roasted-makhana', 'Roasted Makhana',
    'Lightly salted fox-nuts roasted in a touch of cold-pressed coconut oil. Crisp, addictive, and just 90 calories a handful.',
    24900, 100, 80, '/products/roasted-makhana.svg'),
  ((select id from public.categories where slug = 'snacks'), 'baked-ragi-chips', 'Baked Ragi Chips',
    'Stone-ground ragi flour, baked twice for that satisfying crunch. Iron-rich and gluten-conscious.',
    17900, 80, 80, '/products/baked-ragi-chips.svg'),
  ((select id from public.categories where slug = 'snacks'), 'almond-energy-bars', 'Almond Energy Bars (pack of 6)',
    'California almonds, dates, and a whisper of jaggery. No refined sugar, no protein-bar aftertaste.',
    39900, null, 60, '/products/almond-energy-bars.svg'),
  ((select id from public.categories where slug = 'snacks'), 'quinoa-puff-mix', 'Quinoa Puff Mix',
    'Air-puffed quinoa with curry leaves, peanuts and a streak of chilli. Office-drawer-approved.',
    22900, 150, 70, '/products/quinoa-puff-mix.svg'),
  ((select id from public.categories where slug = 'snacks'), 'multigrain-khakhra', 'Multigrain Khakhra',
    'Hand-rolled, slow-roasted Gujarati khakhra with bajra, jowar and methi. As tea-time should be.',
    14900, 200, 100, '/products/multigrain-khakhra.svg')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price_paise = excluded.price_paise,
  weight_grams = excluded.weight_grams,
  image_url = excluded.image_url,
  category_id = excluded.category_id;

-- Beverages
insert into public.products (category_id, slug, name, description, price_paise, weight_grams, stock, image_url) values
  ((select id from public.categories where slug = 'beverages'), 'cold-pressed-amla-juice', 'Cold-Pressed Amla Juice',
    'Single-origin amla pressed within hours of harvest. Tart, vitamin-C rich, no added sugar.',
    44900, 500, 50, '/products/cold-pressed-amla-juice.svg'),
  ((select id from public.categories where slug = 'beverages'), 'tulsi-ginger-green-tea', 'Tulsi-Ginger Green Tea (25 bags)',
    'High-grown Nilgiri green tea, holy basil, and bright Kerala ginger. Calm in a cup.',
    32900, null, 90, '/products/tulsi-ginger-green-tea.svg'),
  ((select id from public.categories where slug = 'beverages'), 'coconut-water-sachets', 'Coconut Water (pack of 6)',
    'Tender coconut water from the Konkan coast, lightly chilled and ready to drink.',
    29900, null, 70, '/products/coconut-water-sachets.svg'),
  ((select id from public.categories where slug = 'beverages'), 'almond-milk-unsweetened', 'Almond Milk — Unsweetened',
    'Just two ingredients: almonds and water. No gums, no thickeners.',
    27900, 1000, 60, '/products/almond-milk-unsweetened.svg'),
  ((select id from public.categories where slug = 'beverages'), 'beetroot-carrot-shot', 'Beetroot-Carrot Wellness Shot (6×60 ml)',
    'A daily-dose ritual: beetroot, carrot, ginger, lemon — and nothing else.',
    49900, null, 50, '/products/beetroot-carrot-shot.svg')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price_paise = excluded.price_paise,
  weight_grams = excluded.weight_grams,
  image_url = excluded.image_url,
  category_id = excluded.category_id;

-- Superfoods
insert into public.products (category_id, slug, name, description, price_paise, weight_grams, stock, image_url) values
  ((select id from public.categories where slug = 'superfoods'), 'raw-forest-honey', 'Raw Forest Honey',
    'Wild-harvested by tribal cooperatives in the Sundarbans. Unfiltered, unheated, untouched.',
    59900, 500, 60, '/products/raw-forest-honey.svg'),
  ((select id from public.categories where slug = 'superfoods'), 'organic-chia-seeds', 'Organic Chia Seeds',
    'Black chia from certified organic farms. High in omega-3s. Spoon into your morning yogurt.',
    34900, 250, 100, '/products/organic-chia-seeds.svg'),
  ((select id from public.categories where slug = 'superfoods'), 'moringa-leaf-powder', 'Moringa Leaf Powder',
    'Shade-dried moringa, cold-milled to retain colour and chlorophyll. A teaspoon goes a long way.',
    44900, 200, 80, '/products/moringa-leaf-powder.svg'),
  ((select id from public.categories where slug = 'superfoods'), 'a2-cow-ghee', 'A2 Cow Ghee',
    'Bilona-method ghee from Gir cows raised on open pasture. Nutty, golden, ridiculous on dosa.',
    89900, 500, 40, '/products/a2-cow-ghee.svg'),
  ((select id from public.categories where slug = 'superfoods'), 'cold-pressed-flaxseed-oil', 'Cold-Pressed Flaxseed Oil',
    'Pressed at low temperature in small batches to preserve omega-3s. Drizzle on salads.',
    52900, 250, 50, '/products/cold-pressed-flaxseed-oil.svg')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price_paise = excluded.price_paise,
  weight_grams = excluded.weight_grams,
  image_url = excluded.image_url,
  category_id = excluded.category_id;

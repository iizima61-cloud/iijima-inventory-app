-- 飯島防水 在庫管理アプリ スキーマ
-- 社内利用の単一テナント想定: ログイン済みユーザー(社員)は全データを閲覧・編集できる。
-- Supabase SQL Editor で全文を実行してください。

-- =========================================
-- 1. profiles (ログインユーザーの表示名)
-- =========================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- auth.users にサインアップされたら profiles を自動作成
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =========================================
-- 2. manufacturers (メーカー)
-- =========================================
create table if not exists manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- =========================================
-- 3. sites (現場)
-- =========================================
create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  note text,
  created_at timestamptz not null default now()
);

-- =========================================
-- 4. products (商品)
-- =========================================
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid references manufacturers(id) on delete set null,
  name text not null,
  code text,
  color_code text,
  swatch_color text,
  category text,
  location text,
  unit text not null default '缶',
  standard_stock numeric not null default 0,
  current_stock numeric not null default 0,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_manufacturer_id_idx on products(manufacturer_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

-- =========================================
-- 5. photos (商品写真)
-- =========================================
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists photos_product_id_idx on photos(product_id);

-- =========================================
-- 6. checkout_history (出庫・戻庫履歴)
-- =========================================
create table if not exists checkout_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  site_id uuid references sites(id) on delete set null,
  movement_type text not null check (movement_type in ('checkout', 'return')),
  quantity numeric not null check (quantity > 0),
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists checkout_history_product_id_idx on checkout_history(product_id);
create index if not exists checkout_history_site_id_idx on checkout_history(site_id);

-- =========================================
-- 7. inventory_log (棚卸履歴)
-- =========================================
create table if not exists inventory_log (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  system_quantity numeric not null,
  counted_quantity numeric not null,
  diff numeric generated always as (counted_quantity - system_quantity) stored,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists inventory_log_product_id_idx on inventory_log(product_id);

-- =========================================
-- 8. RPC: 出庫・戻庫を記録し、在庫数を更新する
-- =========================================
create or replace function record_stock_movement(
  p_product_id uuid,
  p_site_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_note text default null
)
returns void
language plpgsql
security invoker
as $$
begin
  if p_movement_type not in ('checkout', 'return') then
    raise exception '不正な区分です: %', p_movement_type;
  end if;
  if p_quantity <= 0 then
    raise exception '数量は正の数で指定してください';
  end if;

  insert into checkout_history (product_id, site_id, movement_type, quantity, note, created_by)
  values (p_product_id, p_site_id, p_movement_type, p_quantity, p_note, auth.uid());

  if p_movement_type = 'checkout' then
    update products set current_stock = current_stock - p_quantity where id = p_product_id;
  else
    update products set current_stock = current_stock + p_quantity where id = p_product_id;
  end if;
end;
$$;

-- =========================================
-- 9. RPC: 棚卸を記録し、在庫数を実数に補正する
-- =========================================
create or replace function record_inventory_count(
  p_product_id uuid,
  p_counted_quantity numeric,
  p_note text default null
)
returns void
language plpgsql
security invoker
as $$
declare
  v_system_quantity numeric;
begin
  select current_stock into v_system_quantity from products where id = p_product_id for update;

  insert into inventory_log (product_id, system_quantity, counted_quantity, note, created_by)
  values (p_product_id, v_system_quantity, p_counted_quantity, p_note, auth.uid());

  update products set current_stock = p_counted_quantity where id = p_product_id;
end;
$$;

-- =========================================
-- 10. RLS: ログイン済みユーザーは全データを読み書き可能
-- =========================================
alter table profiles enable row level security;
alter table manufacturers enable row level security;
alter table sites enable row level security;
alter table products enable row level security;
alter table photos enable row level security;
alter table checkout_history enable row level security;
alter table inventory_log enable row level security;

create policy profiles_select on profiles for select to authenticated using (true);
create policy profiles_update_self on profiles for update to authenticated using (id = auth.uid());

create policy manufacturers_all on manufacturers for all to authenticated using (true) with check (true);
create policy sites_all on sites for all to authenticated using (true) with check (true);
create policy products_all on products for all to authenticated using (true) with check (true);
create policy photos_all on photos for all to authenticated using (true) with check (true);
create policy checkout_history_all on checkout_history for all to authenticated using (true) with check (true);
create policy inventory_log_all on inventory_log for all to authenticated using (true) with check (true);

-- =========================================
-- 11. app_settings (アプリ名などの表示設定。1行だけのシングルトン)
-- =========================================
create table if not exists app_settings (
  id boolean primary key default true,
  name text not null default '在庫管理',
  constraint app_settings_singleton check (id)
);

insert into app_settings (id, name) values (true, '飯島防水在庫管理')
on conflict (id) do nothing;

alter table app_settings enable row level security;

create policy app_settings_select on app_settings for select to anon, authenticated using (true);
create policy app_settings_update on app_settings for update to authenticated using (true) with check (true);

-- =========================================
-- 12. Storage: 商品写真バケット
-- =========================================
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', false)
on conflict (id) do nothing;

create policy product_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'product-photos');
create policy product_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos');
create policy product_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos');

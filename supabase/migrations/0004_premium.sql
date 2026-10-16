-- Premium features: macros, favorites/servings, body weight, profile data, account deletion.

alter table profiles
  add column goal_carbs_g int not null default 250,
  add column goal_fat_g int not null default 70,
  add column weight_kg numeric,
  add column height_cm numeric,
  add column age int,
  add column sex text check (sex in ('m','f')),
  add column activity int,
  add column goal_type text check (goal_type in ('lose','maintain','gain'));

-- null = unknown (treated as 0 in sums)
alter table foods
  add column carbs_100g numeric check (carbs_100g >= 0),
  add column fat_100g numeric check (fat_100g >= 0),
  add column favorite boolean not null default false,
  add column serving_g numeric check (serving_g > 0),
  add column serving_label text;

create unique index foods_off_code on foods (user_id, off_code) where off_code is not null and deleted_at is null;

create table body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  weight_kg numeric not null check (weight_kg > 0),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, date)
);
alter table body_weights enable row level security;
create policy own on body_weights for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create trigger touch before update on body_weights for each row execute function touch_updated_at();

create index on sessions (started_at);

-- Play Store requirement: in-app account deletion. Cascades through every user_id FK.
create function delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin delete from auth.users where id = auth.uid(); end $$;
revoke execute on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;

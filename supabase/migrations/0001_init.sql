-- Initial schema. Every table: user_id + RLS + updated_at/deleted_at (sync + soft delete).

create table profiles (
  user_id uuid primary key references auth.users on delete cascade,
  meta_kcal int not null default 2000,
  meta_proteina_g int not null default 120,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null,
  kcal_100g numeric not null check (kcal_100g >= 0),
  proteina_100g numeric not null check (proteina_100g >= 0),
  off_code text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('cafe','almoco','jantar','lanche')),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  meal_id uuid not null references meals on delete cascade,
  food_id uuid not null references foods,
  gramas numeric not null check (gramas > 0),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null,
  grupo text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  workout_id uuid not null references workouts on delete cascade,
  exercise_id uuid not null references exercises,
  ordem int not null,
  series_alvo int not null default 3,
  reps_alvo int not null default 10,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  workout_id uuid references workouts,
  inicio timestamptz not null default now(),
  fim timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  session_id uuid not null references sessions on delete cascade,
  exercise_id uuid not null references exercises,
  nr_serie int not null,
  carga_kg numeric not null check (carga_kg >= 0),
  reps int not null check (reps >= 0),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- indexes: per-user/date filters and sync cursor
create index on meals (user_id, data);
create index on meal_items (meal_id);
create index on meal_items (food_id);
create index on workout_exercises (workout_id);
create index on workout_exercises (exercise_id);
create index on sessions (workout_id);
create index on set_logs (session_id);
create index on set_logs (exercise_id);
create index on foods (user_id, nome);

-- automatic updated_at + RLS on every table
create function touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','foods','meals','meal_items','exercises',
    'workouts','workout_exercises','sessions','set_logs'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy own on %I for all to authenticated
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create trigger touch before update on %I
      for each row execute function touch_updated_at()', t);
  end loop;
end $$;

-- create a profile on user sign-up
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles (user_id) values (new.id); return new; end $$;

revoke execute on function handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Workouts: target weight and rest per routine exercise; built-in catalog key for dedupe
alter table workout_exercises
  add column carga_alvo_kg numeric check (carga_alvo_kg >= 0),
  add column descanso_s int not null default 90 check (descanso_s >= 0);

alter table exercises add column catalog_key text;
create unique index exercises_catalog_key on exercises (user_id, catalog_key) where catalog_key is not null;

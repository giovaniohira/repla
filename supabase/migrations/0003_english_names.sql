-- Rename Portuguese columns/values to English. Data is preserved.

alter table profiles rename column meta_kcal to goal_kcal;
alter table profiles rename column meta_proteina_g to goal_protein_g;

alter table foods rename column nome to name;
alter table foods rename column proteina_100g to protein_100g;

alter table meals rename column data to date;
alter table meals rename column tipo to type;
alter table meals drop constraint meals_tipo_check;
update meals set type = case type
  when 'cafe' then 'breakfast' when 'almoco' then 'lunch'
  when 'jantar' then 'dinner' when 'lanche' then 'snack' end;
alter table meals add constraint meals_type_check check (type in ('breakfast','lunch','dinner','snack'));

alter table meal_items rename column gramas to grams;

alter table exercises rename column nome to name;
alter table exercises rename column grupo to muscle_group;

alter table workouts rename column nome to name;

alter table workout_exercises rename column ordem to position;
alter table workout_exercises rename column series_alvo to target_sets;
alter table workout_exercises rename column reps_alvo to target_reps;
alter table workout_exercises rename column carga_alvo_kg to target_weight_kg;
alter table workout_exercises rename column descanso_s to rest_s;

alter table sessions rename column inicio to started_at;
alter table sessions rename column fim to ended_at;

alter table set_logs rename column nr_serie to set_number;
alter table set_logs rename column carga_kg to weight_kg;

-- Profile screen: display name and body-weight goal.
alter table profiles
  add column display_name text check (char_length(display_name) <= 40),
  add column goal_weight_kg numeric check (goal_weight_kg > 0);

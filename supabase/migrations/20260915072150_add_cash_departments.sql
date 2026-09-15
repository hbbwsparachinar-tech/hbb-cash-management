create table public.cash_departments (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz not null default now(),
  constraint cash_departments_name_not_blank check (btrim(name) <> '')
);

create unique index cash_departments_name_lower_idx
  on public.cash_departments (lower(name));

alter table public.cash_departments enable row level security;

revoke all on table public.cash_departments from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert on table public.cash_departments to service_role;
grant usage, select on sequence public.cash_departments_id_seq to service_role;

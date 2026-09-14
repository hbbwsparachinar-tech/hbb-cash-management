create table public.cash_transactions (
  id bigint generated always as identity primary key,
  voucher text unique,
  transaction_date date not null,
  transaction_type text not null check (transaction_type in ('Cash In', 'Cash Out')),
  category text not null,
  amount numeric(14, 2) not null check (amount > 0),
  source text not null default '',
  destination text not null default '',
  description text not null default '',
  created_at timestamptz not null default now(),
  constraint cash_transactions_entry_fields_check check (
    (transaction_type = 'Cash In' and voucher is null and source <> '' and destination = '')
    or
    (transaction_type = 'Cash Out' and voucher is not null and source = '' and destination <> '')
  )
);

create index cash_transactions_date_type_idx
  on public.cash_transactions (transaction_date desc, transaction_type);

create table public.cash_settings (
  id smallint primary key check (id = 1),
  hospital_name text not null,
  currency_symbol text not null
);

insert into public.cash_settings (id, hospital_name, currency_symbol)
values (1, 'HBB Hospital', 'Rs.');

alter table public.cash_transactions enable row level security;
alter table public.cash_settings enable row level security;

revoke all on table public.cash_transactions from anon, authenticated;
revoke all on table public.cash_settings from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.cash_transactions to service_role;
grant select on table public.cash_settings to service_role;
grant usage, select on sequence public.cash_transactions_id_seq to service_role;

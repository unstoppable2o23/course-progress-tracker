-- CLEAN RESET: drop everything first, then recreate
-- Run this entire script in Supabase SQL editor

drop view if exists public.student_view;
drop table if exists public.live_sessions cascade;
drop table if exists public.ucla_enrollments cascade;
drop table if exists public.student_aliases cascade;
drop table if exists public.students cascade;
drop table if exists public.sources cascade;
drop table if exists public.sync_logs cascade;
drop table if exists public.app_users cascade;
drop table if exists public.profiles cascade;
drop table if exists public.categories cascade;
drop table if exists public.completions cascade;
drop table if exists public.completion_records cascade;
drop table if exists public.student_rows cascade;
drop function if exists public.normalize_phone(text) cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.is_active_user() cascade;
drop function if exists public.is_supabase_configured() cascade;

-- ── App Users (RBAC) ─────────────────────────────────────────────────
create table public.app_users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Sources (upload tracking) ─────────────────────────────────────────
create table public.sources (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('master', 'ucla', 'live')),
  file_name text,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ── Students (master records) ────────────────────────────────────────
create table public.students (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  primary_email text,
  phone text,
  advisor text,
  sales_type text,
  payment_date date,
  welcome_call_done boolean default false,
  certificate_received boolean default false,
  batch_date date,
  psychometric_offered boolean default false,
  sale_month text,
  lead_date date,
  installment text,
  amount numeric,
  payment_mode text,
  full_course_fee numeric,
  source_id uuid references public.sources(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_students_email on public.students (lower(primary_email));
create index idx_students_phone on public.students (phone);
create index idx_students_name on public.students (lower(name));

-- ── Aliases (secondary contacts) ─────────────────────────────────────
create table public.student_aliases (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  email text,
  phone text,
  source text not null,
  created_at timestamptz not null default now()
);

create index idx_aliases_student on public.student_aliases (student_id);
create index idx_aliases_email on public.student_aliases (lower(email));
create index idx_aliases_phone on public.student_aliases (phone);

-- ── UCLA Enrollments ─────────────────────────────────────────────────
create table public.ucla_enrollments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete set null,
  email text,
  phone text,
  full_name text,
  interest_flag text,
  batch_title text,
  batch_start_date date,
  batch_end_date date,
  form_timestamp timestamptz,
  source_id uuid references public.sources(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── Live Sessions ────────────────────────────────────────────────────
create table public.live_sessions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete set null,
  session_name text not null check (session_name in ('Parent Counselling', 'Interpretation of Psychometric Test', 'Do''s and Don''ts of Career Counselling')),
  attended_at timestamptz,
  source_id uuid references public.sources(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index idx_live_student_session on public.live_sessions (student_id, session_name);

-- ── Sync Logs ────────────────────────────────────────────────────────
create table public.sync_logs (
  id uuid primary key default uuid_generate_v4(),
  status text not null default 'success',
  sources_processed int not null default 0,
  rows_read int not null default 0,
  students_updated int not null default 0,
  new_students int not null default 0,
  errors text[] not null default '{}',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- ── Helper Functions ─────────────────────────────────────────────────

create or replace function public.normalize_phone(p text)
returns text language sql immutable as $$
  select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g');
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.app_users
    where email = auth.email() and role = 'admin' and is_active
  );
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.app_users
    where email = auth.email() and is_active
  );
$$;

-- ── Read Model View ──────────────────────────────────────────────────
create or replace view public.student_view as
select
  s.id,
  s.name,
  s.primary_email,
  s.phone,
  s.advisor,
  s.sales_type,
  s.payment_date,
  s.sale_month,
  s.installment,
  s.amount,
  s.payment_mode,
  s.full_course_fee,
  s.welcome_call_done,
  s.certificate_received,
  s.psychometric_offered,
  s.batch_date,
  s.created_at,
  s.updated_at,
  case
    when s.payment_date is not null and (current_date - s.payment_date) >= 180
    then true else false
  end as is_expired_180,
  case
    when s.payment_date is not null
    then (current_date - s.payment_date)
    else null
  end as days_since_payment,
  (
    select jsonb_agg(jsonb_build_object('email', a.email, 'phone', a.phone, 'source', a.source))
    from public.student_aliases a where a.student_id = s.id
  ) as aliases,
  (
    select count(*) from public.live_sessions ls where ls.student_id = s.id
  ) as live_sessions_completed,
  (
    select jsonb_object_agg(ls.session_name, ls.attended_at)
    from public.live_sessions ls where ls.student_id = s.id
  ) as live_sessions,
  (
    select jsonb_agg(jsonb_build_object(
      'batch_title', u.batch_title,
      'batch_start', u.batch_start_date,
      'batch_end', u.batch_end_date,
      'timestamp', u.form_timestamp,
      'interest', u.interest_flag
    ) order by u.form_timestamp)
    from public.ucla_enrollments u where u.student_id = s.id
  ) as ucla_enrollments
from public.students s;

-- ── RLS Policies ─────────────────────────────────────────────────────
alter table public.app_users enable row level security;
alter table public.students enable row level security;
alter table public.student_aliases enable row level security;
alter table public.ucla_enrollments enable row level security;
alter table public.live_sessions enable row level security;
alter table public.sources enable row level security;
alter table public.sync_logs enable row level security;

create policy "read users" on public.app_users for select using (public.is_active_user());
create policy "admin write users" on public.app_users for all using (public.is_admin()) with check (public.is_admin());

create policy "read students" on public.students for select using (public.is_active_user());
create policy "admin write students" on public.students for all using (public.is_admin()) with check (public.is_admin());

create policy "read aliases" on public.student_aliases for select using (public.is_active_user());
create policy "admin write aliases" on public.student_aliases for all using (public.is_admin()) with check (public.is_admin());

create policy "read ucla" on public.ucla_enrollments for select using (public.is_active_user());
create policy "admin write ucla" on public.ucla_enrollments for all using (public.is_admin()) with check (public.is_admin());

create policy "read live" on public.live_sessions for select using (public.is_active_user());
create policy "admin write live" on public.live_sessions for all using (public.is_admin()) with check (public.is_admin());

create policy "read sources" on public.sources for select using (public.is_active_user());
create policy "admin write sources" on public.sources for all using (public.is_admin()) with check (public.is_admin());

create policy "read logs" on public.sync_logs for select using (public.is_active_user());
create policy "admin write logs" on public.sync_logs for all using (public.is_admin()) with check (public.is_admin());

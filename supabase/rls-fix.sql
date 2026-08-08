-- Fix RLS: allow users to read their own app_users record
drop policy if exists "read users" on public.app_users;
create policy "read own user" on public.app_users for select using (
  email = auth.email() or public.is_admin()
);

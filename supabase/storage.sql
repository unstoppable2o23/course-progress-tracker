-- Run in Supabase SQL editor to create storage bucket
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

-- RLS for storage
create policy "Admin upload" on storage.objects
  for all using (
    bucket_id = 'uploads' and
    exists (select 1 from public.app_users where email = auth.email() and role = 'admin' and is_active)
  )
  with check (
    bucket_id = 'uploads' and
    exists (select 1 from public.app_users where email = auth.email() and role = 'admin' and is_active)
  );

create policy "Authenticated read" on storage.objects
  for select using (
    bucket_id = 'uploads' and auth.role() = 'authenticated'
  );

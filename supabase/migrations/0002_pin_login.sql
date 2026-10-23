-- Failed PIN attempts, used to lock the login for a while after repeated wrong PINs.
-- Only the server (service role) touches this table.
create table if not exists public.pin_attempts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);
alter table public.pin_attempts enable row level security;

-- Let the server (service role) and direct database sessions (SQL editor) set roles too;
-- the app uses the server key when an admin adds a new staff member.
create or replace function public.protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
begin
  if new.role is distinct from old.role
     and v_role <> 'service_role'
     and v_role <> ''
     and not public.is_admin() then
    raise exception 'ONLY_ADMIN_CHANGES_ROLES';
  end if;
  return new;
end $$;

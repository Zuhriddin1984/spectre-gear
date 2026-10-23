-- Sign-in without a server key: the database checks the shared PIN, creates staff
-- accounts and hands the website a fresh one-time password for the chosen person.
-- The site then needs only the public URL and anon key.

-- Private settings (PIN hash, cron secret). No policies: only the functions below read it.
create table if not exists public.app_secrets (
  key text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

-- Staff names for the login screen (shown before anyone is signed in).
create or replace function public.login_staff()
returns table (id uuid, full_name text, role text)
language sql stable security definer set search_path = public as $$
  select id, full_name, role from profiles order by full_name
$$;

-- Creates a Supabase auth user with a random password; the signup trigger adds the profile.
create or replace function public._create_staff_user(p_name text)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := 'staff-' || v_id || '@spectre-gear.local';
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change, email_change_token_new)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
          crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p_name), now(), now(),
          '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
          'email', now(), now(), now());
  return v_id;
end $$;

-- Gives the user a new random password and returns it, so the website can sign in once with it.
create or replace function public._issue_password(p_user uuid)
returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_pw text := encode(gen_random_bytes(24), 'hex');
  v_email text;
begin
  update auth.users set encrypted_password = crypt(v_pw, gen_salt('bf')), updated_at = now()
  where id = p_user returning email into v_email;
  if v_email is null then return json_build_object('error', 'NO_USER'); end if;
  return json_build_object('email', v_email, 'password', v_pw);
end $$;

-- Checks the PIN; 10 wrong PINs within 15 minutes lock sign-in. Returns an error code or null.
create or replace function public._check_pin(p_pin text)
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text := (select value from app_secrets where key = 'pin_hash');
  -- failures before the last correct PIN no longer count
  v_since timestamptz := greatest(now() - interval '15 minutes',
    coalesce((select value::timestamptz from app_secrets where key = 'pin_last_ok'), '-infinity'));
begin
  if v_hash is null then return 'NO_PIN'; end if;
  if (select count(*) from pin_attempts where created_at > v_since) >= 10 then
    return 'LOCKED';
  end if;
  if crypt(coalesce(p_pin, ''), v_hash) <> v_hash then
    insert into pin_attempts default values;
    return 'BAD_PIN';
  end if;
  insert into app_secrets (key, value) values ('pin_last_ok', now()::text)
  on conflict (key) do update set value = excluded.value;
  return null;
end $$;

create or replace function public.pin_sign_in(p_user uuid, p_pin text)
returns json
language plpgsql security definer set search_path = public as $$
declare v_err text := _check_pin(p_pin);
begin
  if v_err is not null then return json_build_object('error', v_err); end if;
  return _issue_password(p_user);
end $$;

-- Only while nobody exists yet: the first person becomes admin.
create or replace function public.create_first_admin(p_name text, p_pin text)
returns json
language plpgsql security definer set search_path = public as $$
declare v_err text;
begin
  if exists (select 1 from profiles) then return json_build_object('error', 'ALREADY_SET_UP'); end if;
  v_err := _check_pin(p_pin);
  if v_err is not null then return json_build_object('error', v_err); end if;
  return _issue_password(_create_staff_user(coalesce(nullif(trim(p_name), ''), 'Admin')));
end $$;

create or replace function public.add_staff(p_name text, p_role text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_admin() then raise exception 'ONLY_ADMIN_CHANGES_ROLES'; end if;
  v_id := _create_staff_user(p_name);
  update profiles set full_name = p_name, role = p_role where id = v_id;
  return v_id;
end $$;

-- Admins change the shared PIN from the Staff page.
create or replace function public.set_access_pin(p_pin text)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_admin() then raise exception 'ONLY_ADMIN_CHANGES_ROLES'; end if;
  if coalesce(length(trim(p_pin)), 0) < 4 then raise exception 'PIN_TOO_SHORT'; end if;
  insert into app_secrets (key, value) values ('pin_hash', crypt(trim(p_pin), gen_salt('bf')))
  on conflict (key) do update set value = excluded.value;
end $$;

-- Overdue returns for the daily Telegram reminder; the cron job proves itself with the shared secret.
create or replace function public.overdue_report(p_secret text)
returns table (booking_id bigint, number text, client text, phone text, end_date date, items text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if p_secret is null or p_secret is distinct from (select value from app_secrets where key = 'cron_secret') then
    raise exception 'UNAUTHORIZED';
  end if;
  return query
    select b.id, b.number, c.name, coalesce(c.phone, ''), min(bi.end_date), array_agg(i.name order by i.code)
    from booking_items bi
    join bookings b on b.id = bi.booking_id
    join clients c on c.id = b.client_id
    join items i on i.id = bi.item_id
    where bi.active and bi.out_at is not null and bi.end_date < (now() at time zone 'Asia/Tashkent')::date
    group by b.id, b.number, c.name, c.phone
    order by min(bi.end_date);
end $$;

-- Supabase lets anon/authenticated run new public functions by default; narrow that down.
revoke execute on function public._create_staff_user(text), public._issue_password(uuid), public._check_pin(text) from public, anon, authenticated;
revoke execute on function public.add_staff(text, text), public.set_access_pin(text) from public, anon;
grant execute on function public.add_staff(text, text), public.set_access_pin(text) to authenticated;
grant execute on function public.login_staff(), public.pin_sign_in(uuid, text), public.create_first_admin(text, text), public.overdue_report(text) to anon, authenticated;

-- The server key is no longer used, so role changes are only allowed for admins
-- (and for SQL run directly in the database, which has no request claims).
create or replace function public.protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', '');
begin
  if new.role is distinct from old.role and v_role <> '' and not public.is_admin() then
    raise exception 'ONLY_ADMIN_CHANGES_ROLES';
  end if;
  return new;
end $$;

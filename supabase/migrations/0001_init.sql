-- Spectre Gear: equipment management for Spectrerental (internal use)
create extension if not exists btree_gist;

-- Staff profiles (one per Supabase auth user)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text not null default 'tech' check (role in ('admin', 'store', 'manager', 'tech')),
  created_at timestamptz not null default now()
);

-- The first user to sign up becomes admin, everyone after is a technician until an admin changes it.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when exists (select 1 from public.profiles) then 'tech' else 'admin' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.categories (
  slug text primary key,
  name_uz text not null,
  name_ru text not null,
  sort int not null default 0
);

create table public.items (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  category text not null references public.categories (slug),
  serial text,
  daily_price bigint not null default 0 check (daily_price >= 0),
  value bigint not null default 0 check (value >= 0),
  in_repair boolean not null default false,
  issue text,               -- open defect, null when the item is fine
  photo_url text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.clients (
  id bigint generated always as identity primary key,
  name text not null,
  phone text,
  note text,
  created_at timestamptz not null default now()
);

create table public.kits (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.kit_items (
  kit_id bigint not null references public.kits on delete cascade,
  item_id bigint not null references public.items on delete cascade,
  primary key (kit_id, item_id)
);

create sequence public.booking_no start 1001;

create table public.bookings (
  id bigint generated always as identity primary key,
  number text not null unique default ('B-' || nextval('public.booking_no')),
  client_id bigint not null references public.clients,
  start_date date not null,
  end_date date not null,
  state text not null default 'reserved' check (state in ('reserved', 'out', 'closed', 'cancelled')),
  note text,
  created_by uuid references auth.users default auth.uid(),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- One row per item in a booking. "active" rows hold the item; the exclusion
-- constraint makes double booking of the same item impossible at database level.
create table public.booking_items (
  id bigint generated always as identity primary key,
  booking_id bigint not null references public.bookings on delete cascade,
  item_id bigint not null references public.items,
  start_date date not null,
  end_date date not null,
  active boolean not null default true,
  out_at timestamptz,
  out_by uuid references auth.users,
  returned_at timestamptz,
  returned_by uuid references auth.users,
  return_note text,
  unique (booking_id, item_id),
  constraint no_double_booking exclude using gist (
    item_id with =,
    daterange(start_date, end_date, '[]') with &&
  ) where (active)
);
create index on public.booking_items (item_id) where active;

create table public.item_events (
  id bigint generated always as identity primary key,
  item_id bigint not null references public.items on delete cascade,
  kind text not null check (kind in ('issue', 'issue_fixed', 'repair_out', 'repair_back', 'checkout', 'return', 'note')),
  text text,
  booking_id bigint references public.bookings on delete set null,
  user_id uuid references public.profiles default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.item_events (item_id, created_at desc);

create table public.audits (
  id bigint generated always as identity primary key,
  category text not null references public.categories (slug),
  expected int not null,
  found int not null,
  missing_codes text[] not null default '{}',
  user_id uuid references public.profiles default auth.uid(),
  created_at timestamptz not null default now()
);

-- Current state of every item: available / reserved / out / late / repair
create view public.item_status with (security_invoker = on) as
select
  i.*,
  case
    when i.in_repair then 'repair'
    when o.id is not null and o.end_date < current_date then 'late'
    when o.id is not null then 'out'
    when r.id is not null then 'reserved'
    else 'available'
  end as status,
  coalesce(o.booking_id, r.booking_id) as booking_id,
  coalesce(o.start_date, r.start_date) as booking_start,
  coalesce(o.end_date, r.end_date) as booking_end
from public.items i
left join lateral (
  select bi.* from public.booking_items bi
  where bi.item_id = i.id and bi.active and bi.out_at is not null
  order by bi.start_date limit 1
) o on true
left join lateral (
  select bi.* from public.booking_items bi
  where bi.item_id = i.id and bi.active and bi.out_at is null and bi.end_date >= current_date
  order by bi.start_date limit 1
) r on true
where i.active;

-- Which of these items cannot be booked for the given dates, and why.
-- An item that is out past its return date is treated as busy until it comes back.
create function public.check_conflicts(p_item_ids bigint[], p_start date, p_end date, p_skip_booking bigint default null)
returns table (item_id bigint, code text, name text, reason text, booking_number text, client_name text, start_date date, end_date date)
language sql stable security invoker set search_path = public as $$
  select i.id, i.code, i.name, 'repair', null, null, null::date, null::date
  from items i where i.id = any (p_item_ids) and i.in_repair
  union all
  select i.id, i.code, i.name,
         case when bi.out_at is not null then 'out' else 'reserved' end,
         b.number, c.name, bi.start_date, bi.end_date
  from booking_items bi
  join items i on i.id = bi.item_id
  join bookings b on b.id = bi.booking_id
  join clients c on c.id = b.client_id
  where bi.item_id = any (p_item_ids)
    and bi.active
    and b.id is distinct from p_skip_booking
    and bi.start_date <= p_end
    and (case when bi.out_at is not null then greatest(bi.end_date, current_date) else bi.end_date end) >= p_start
$$;

-- Create a reservation atomically. Raises an error listing conflicts if any item is busy.
create function public.create_booking(p_client bigint, p_start date, p_end date, p_item_ids bigint[], p_note text default null)
returns bigint
language plpgsql security invoker set search_path = public as $$
declare
  v_id bigint;
  v_conf text;
begin
  if coalesce(array_length(p_item_ids, 1), 0) = 0 then
    raise exception 'NO_ITEMS';
  end if;
  select string_agg(code, ', ') into v_conf from check_conflicts(p_item_ids, p_start, p_end);
  if v_conf is not null then
    raise exception 'CONFLICT: %', v_conf;
  end if;
  insert into bookings (client_id, start_date, end_date, note)
  values (p_client, p_start, p_end, p_note) returning id into v_id;
  insert into booking_items (booking_id, item_id, start_date, end_date)
  select v_id, x, p_start, p_end from unnest(p_item_ids) as x group by x;
  return v_id;
end $$;

-- Hand out every item of a reservation.
create function public.checkout_booking(p_booking bigint)
returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_b bookings;
  v_conf text;
  v_ids bigint[];
begin
  select * into v_b from bookings where id = p_booking for update;
  if v_b.state <> 'reserved' then raise exception 'NOT_RESERVED'; end if;
  select array_agg(item_id) into v_ids from booking_items where booking_id = p_booking and active;
  -- items still out with someone else, or in repair, block the handout
  select string_agg(code, ', ') into v_conf
  from check_conflicts(v_ids, least(v_b.start_date, current_date), least(v_b.start_date, current_date), p_booking)
  where reason in ('out', 'repair');
  if v_conf is not null then raise exception 'CONFLICT: %', v_conf; end if;

  update booking_items set out_at = now(), out_by = auth.uid(),
         start_date = least(start_date, current_date)
  where booking_id = p_booking and active;
  update bookings set state = 'out', start_date = least(start_date, current_date) where id = p_booking;
  insert into item_events (item_id, kind, booking_id)
  select item_id, 'checkout', p_booking from booking_items where booking_id = p_booking and active;
end $$;

-- Take back one item; closes the booking when everything is back.
create function public.return_item(p_booking bigint, p_item bigint, p_issue text default null)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  update booking_items
     set active = false, returned_at = now(), returned_by = auth.uid(), return_note = nullif(p_issue, '')
   where booking_id = p_booking and item_id = p_item and active and out_at is not null;
  if not found then raise exception 'NOT_OUT'; end if;
  insert into item_events (item_id, kind, booking_id, text) values (p_item, 'return', p_booking, nullif(p_issue, ''));
  if nullif(p_issue, '') is not null then
    update items set issue = p_issue where id = p_item;
    insert into item_events (item_id, kind, booking_id, text) values (p_item, 'issue', p_booking, p_issue);
  end if;
  if not exists (select 1 from booking_items where booking_id = p_booking and active) then
    update bookings set state = 'closed' where id = p_booking;
  end if;
end $$;

-- Hand out a single item right now without a prior reservation.
create function public.quick_checkout(p_client bigint, p_item bigint, p_end date)
returns bigint
language plpgsql security invoker set search_path = public as $$
declare v_id bigint;
begin
  v_id := create_booking(p_client, current_date, p_end, array[p_item]);
  perform checkout_booking(v_id);
  return v_id;
end $$;

create function public.cancel_booking(p_booking bigint)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  update bookings set state = 'cancelled' where id = p_booking and state = 'reserved';
  if not found then raise exception 'NOT_RESERVED'; end if;
  update booking_items set active = false where booking_id = p_booking;
end $$;

-- Row level security: any signed-in staff member can work with everything.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.clients enable row level security;
alter table public.kits enable row level security;
alter table public.kit_items enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.item_events enable row level security;
alter table public.audits enable row level security;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

create policy "staff read profiles" on public.profiles for select to authenticated using (true);
create policy "admin edits profiles" on public.profiles for update to authenticated using (public.is_admin() or id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['categories','items','clients','kits','kit_items','bookings','booking_items','item_events','audits'] loop
    execute format('create policy "staff full access" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Photos bucket (public read, staff upload)
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict do nothing;
create policy "staff upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'photos');
create policy "staff update photos" on storage.objects for update to authenticated using (bucket_id = 'photos');

-- Only an admin may change roles.
create function public.protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'ONLY_ADMIN_CHANGES_ROLES';
  end if;
  return new;
end $$;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role();

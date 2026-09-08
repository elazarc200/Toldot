-- Phase 0: editorial authorization foundation only.
-- No historical entity tables.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.editorial_capabilities (
  code text primary key,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.editorial_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.role_capabilities (
  role_id uuid not null references public.editorial_roles (id) on delete cascade,
  capability_code text not null references public.editorial_capabilities (code) on delete cascade,
  primary key (role_id, capability_code)
);

create table public.editorial_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.editorial_roles (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role_id)
);

create index editorial_memberships_user_id_idx
  on public.editorial_memberships (user_id)
  where is_active;

-- ---------------------------------------------------------------------------
-- Seed vocabulary + full_editor role
-- ---------------------------------------------------------------------------

insert into public.editorial_capabilities (code, description) values
  ('edit', 'Edit editorial draft content'),
  ('review', 'Review editorial proposals'),
  ('approve', 'Approve editorial content'),
  ('publish', 'Publish approved content'),
  ('rollback', 'Roll back published versions'),
  ('merge_entities', 'Merge duplicate entities'),
  ('manage_corpus', 'Manage approved source corpus'),
  ('manage_editorial_membership', 'Manage editorial roles and memberships');

insert into public.editorial_roles (code, description)
values ('full_editor', 'Phase 0 role bundling all editorial capabilities');

insert into public.role_capabilities (role_id, capability_code)
select r.id, c.code
from public.editorial_roles r
cross join public.editorial_capabilities c
where r.code = 'full_editor';

-- ---------------------------------------------------------------------------
-- has_capability: identity from auth.uid() only; no caller-selected user id.
-- SECURITY DEFINER + fixed search_path avoids RLS recursion and keeps
-- authorization tables unreadable to ordinary users.
-- ---------------------------------------------------------------------------

create or replace function public.has_capability(capability text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  acting_user uuid := auth.uid();
begin
  if acting_user is null then
    return false;
  end if;

  if capability is null or length(trim(capability)) = 0 then
    return false;
  end if;

  return exists (
    select 1
    from public.editorial_memberships m
    inner join public.role_capabilities rc
      on rc.role_id = m.role_id
    where m.user_id = acting_user
      and m.is_active = true
      and rc.capability_code = capability
  );
end;
$$;

revoke all on function public.has_capability(text) from public;
grant execute on function public.has_capability(text) to authenticated;

comment on function public.has_capability(text) is
  'Returns whether auth.uid() has the given capability via active editorial membership → role → capabilities. Callers cannot supply the subject user id.';

-- ---------------------------------------------------------------------------
-- RLS: deny-by-default (no policies for anon/authenticated).
-- Service role (bootstrap script only) bypasses RLS.
-- Capability checks use has_capability, not direct table reads.
-- ---------------------------------------------------------------------------

alter table public.editorial_capabilities enable row level security;
alter table public.editorial_roles enable row level security;
alter table public.role_capabilities enable row level security;
alter table public.editorial_memberships enable row level security;

-- No FORCE: table owners / BYPASSRLS roles (service_role) remain usable for
-- bootstrap and SECURITY DEFINER has_capability. anon/authenticated still
-- have zero policies → deny-by-default for direct table access.

revoke all on table public.editorial_capabilities from anon, authenticated;
revoke all on table public.editorial_roles from anon, authenticated;
revoke all on table public.role_capabilities from anon, authenticated;
revoke all on table public.editorial_memberships from anon, authenticated;

-- Authenticated may execute has_capability only (granted above).
-- No INSERT/UPDATE/DELETE policies: ordinary users cannot alter authz data.

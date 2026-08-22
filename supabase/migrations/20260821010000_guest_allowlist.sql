-- ============================================================
-- Guest allowlist -- invite specific non-@berkeley.edu emails
-- ============================================================
--
-- proxy.ts enforces @berkeley.edu for everyone by default (see that
-- file for the domain check itself). This table is the one escape
-- hatch: an email parked here clears that gate for that address only.
-- It's populated automatically whenever exec adds a non-Berkeley email
-- through People -> "+ Add people" (app/(app)/directory/actions.ts) --
-- there's no separate "invite a guest" screen. Enrolling someone with
-- a Gmail address IS the invite.
--
-- is_allowed_guest() is `security definer` for the same reason as
-- is_exec()/is_enrolled() in 20260717000100_rls_policies.sql: the
-- calling user (not exec, maybe not enrolled in anything yet) needs to
-- check whether THEIR OWN email is on the list, and the table itself
-- is exec-only under RLS.

create table public.guest_allowlist (
    email text primary key,
    invited_by uuid references public.users(id) on delete set null,
    note text,
    created_at timestamptz not null default now()
  );
create index guest_allowlist_email_lower_idx on public.guest_allowlist (lower(email));

alter table public.guest_allowlist enable row level security;
create policy "guest_allowlist_all_exec" on public.guest_allowlist
  for all to authenticated using (public.is_exec()) with check (public.is_exec());

grant select, insert, update, delete on public.guest_allowlist to authenticated;

create function public.is_allowed_guest(check_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
      select 1 from public.guest_allowlist
      where lower(email) = lower(check_email)
    );
$$;

grant execute on function public.is_allowed_guest(text) to authenticated;

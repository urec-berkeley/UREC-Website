-- Create invites table for guest invitation system
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  guest_email text not null,
  invited_by uuid not null references auth.users(id),
  course_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  token text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

create index invites_token_idx on public.invites(token);
create index invites_email_course_idx on public.invites(guest_email, course_id);

alter table public.invites enable row level security;

create policy "exec_manage_invites" on public.invites
  for all using (
    auth.uid() = invited_by or (select is_exec())
  );

create or replace function public.accept_invite(invite_token text)
returns table (guest_email text, course_id uuid) as $$
declare
  v_invite record;
begin
  select * into v_invite from public.invites
  where token = invite_token
    and status = 'pending'
    and expires_at > now();
  
  if v_invite is null then
    raise exception 'Invalid or expired invite';
  end if;
  
  update public.invites
  set status = 'accepted'
  where id = v_invite.id;
  
  return query select v_invite.guest_email, v_invite.course_id;
end;
$$ language plpgsql security definer;

grant select, insert, update, delete on public.invites to authenticated;
grant execute on function public.accept_invite to authenticated;

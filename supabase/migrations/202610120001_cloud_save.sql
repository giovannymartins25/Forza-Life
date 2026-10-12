-- Horizon Life: one revisioned full-save snapshot per authenticated player.
-- Additive migration. It does not touch or delete any local IndexedDB data.
create table if not exists public.horizon_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  revision bigint not null check (revision > 0),
  save jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.horizon_saves enable row level security;
revoke all on public.horizon_saves from public, anon, authenticated;
grant select on public.horizon_saves to authenticated;

drop policy if exists "Players read own Horizon save" on public.horizon_saves;
create policy "Players read own Horizon save" on public.horizon_saves
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Players insert own Horizon save" on public.horizon_saves;
drop policy if exists "Players update own Horizon save" on public.horizon_saves;

create or replace function public.save_horizon_snapshot(p_save jsonb, p_expected_revision bigint)
returns setof public.horizon_saves
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_id uuid := auth.uid();
begin
  if player_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_save is null or p_save->>'appName' is distinct from 'Horizon Life'
     or jsonb_typeof(p_save->'data') is distinct from 'object' then
    raise exception 'invalid Horizon save' using errcode = '22023';
  end if;

  if p_expected_revision = 0 then
    return query
      insert into public.horizon_saves (user_id, revision, save, updated_at)
      values (player_id, 1, p_save, now())
      on conflict (user_id) do nothing
      returning *;
  else
    return query
      update public.horizon_saves
         set revision = revision + 1, save = p_save, updated_at = now()
       where user_id = player_id and revision = p_expected_revision
      returning *;
  end if;
end;
$$;

revoke all on function public.save_horizon_snapshot(jsonb, bigint) from public, anon;
grant execute on function public.save_horizon_snapshot(jsonb, bigint) to authenticated;

comment on table public.horizon_saves is 'Complete Horizon Life backup snapshot per authenticated player; revision is advanced atomically.';

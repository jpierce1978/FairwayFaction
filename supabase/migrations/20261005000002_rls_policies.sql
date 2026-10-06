-- FairwayFaction Row Level Security (Milestone 1)
-- Policies are expressed in terms of the capabilities in src/domains/permissions:
--   faction.manage / invite  -> faction admin
--   round.edit / start / finish / score_correct_any -> round creator or faction admin ("manage")
--   round.score_self / score_group -> the player themself / their scoring group
-- Anonymous users get nothing: every policy targets `authenticated`.

-- ---------------------------------------------------------------------------
-- Helper functions. SECURITY DEFINER so policies can consult membership tables
-- without recursive RLS evaluation; search_path is pinned to avoid hijacking.
-- ---------------------------------------------------------------------------
create or replace function is_faction_member(fid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from faction_members
    where faction_id = fid and user_id = auth.uid() and status = 'ACTIVE'
  );
$$;

create or replace function is_faction_admin(fid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from faction_members
    where faction_id = fid and user_id = auth.uid() and status = 'ACTIVE' and role = 'ADMIN'
  );
$$;

create or replace function shares_faction_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from faction_members mine
    join faction_members theirs on theirs.faction_id = mine.faction_id
    where mine.user_id = auth.uid() and mine.status = 'ACTIVE'
      and theirs.user_id = other and theirs.status = 'ACTIVE'
  );
$$;

create or replace function can_view_round(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from rounds r
    where r.id = rid
      and (
        r.created_by = auth.uid()
        or (r.faction_id is not null and is_faction_member(r.faction_id))
        or exists (
          select 1 from round_players rp where rp.round_id = r.id and rp.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function can_manage_round(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from rounds r
    where r.id = rid
      and (r.created_by = auth.uid() or (r.faction_id is not null and is_faction_admin(r.faction_id)))
  );
$$;

create or replace function round_of_player(rpid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select round_id from round_players where id = rpid;
$$;

create or replace function can_score_player(rpid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from round_players rp
    where rp.id = rpid
      and (
        can_manage_round(rp.round_id)
        or rp.user_id = auth.uid()
        or (
          rp.scoring_group_id is not null
          and exists (
            select 1 from round_players me
            where me.round_id = rp.round_id
              and me.user_id = auth.uid()
              and me.scoring_group_id = rp.scoring_group_id
          )
        )
      )
  );
$$;

create or replace function faction_of_scheduled_round(srid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select faction_id from scheduled_rounds where id = srid;
$$;

create or replace function course_is_owned(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from courses where id = cid and created_by = auth.uid());
$$;

revoke all on function
  is_faction_member(uuid), is_faction_admin(uuid), shares_faction_with(uuid),
  can_view_round(uuid), can_manage_round(uuid), round_of_player(uuid),
  can_score_player(uuid), faction_of_scheduled_round(uuid), course_is_owned(uuid)
from public;
grant execute on function
  is_faction_member(uuid), is_faction_admin(uuid), shares_faction_with(uuid),
  can_view_round(uuid), can_manage_round(uuid), round_of_player(uuid),
  can_score_player(uuid), faction_of_scheduled_round(uuid), course_is_owned(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- A new faction's creator automatically becomes its first ADMIN.
-- ---------------------------------------------------------------------------
create or replace function add_faction_creator_as_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into faction_members (faction_id, user_id, role, status)
  values (new.id, new.created_by, 'ADMIN', 'ACTIVE');
  return new;
end;
$$;

create trigger factions_add_creator_admin after insert on factions
  for each row execute function add_faction_creator_as_admin();

-- ---------------------------------------------------------------------------
-- Joining by invite code. Clients cannot insert faction_members for themselves;
-- they must present a valid code. Invites are reusable until they expire or are
-- revoked (status USED is reserved for future single-use invites).
-- ---------------------------------------------------------------------------
create or replace function join_faction_by_code(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_invite faction_invites%rowtype;
  v_existing faction_member_status;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_invite from faction_invites
  where code = p_code and status = 'ACTIVE' and (expires_at is null or expires_at > now());
  if not found then
    raise exception 'Invite is invalid or has expired' using errcode = 'P0002';
  end if;

  select status into v_existing from faction_members
  where faction_id = v_invite.faction_id and user_id = auth.uid();
  if v_existing = 'REMOVED' then
    raise exception 'You cannot rejoin this group with an invite' using errcode = '42501';
  end if;

  insert into faction_members (faction_id, user_id, role, status)
  values (v_invite.faction_id, auth.uid(), 'MEMBER', 'ACTIVE')
  on conflict (faction_id, user_id) do update set status = 'ACTIVE';

  return v_invite.faction_id;
end;
$$;

-- What the "Join Group" screen shows before the user commits (UX_SPEC §7).
create or replace function preview_faction_invite(p_code text)
returns table (faction_id uuid, faction_name text, home_course_name text, member_count bigint)
language sql stable security definer set search_path = public as $$
  select f.id, f.name, c.name,
         (select count(*) from faction_members m where m.faction_id = f.id and m.status = 'ACTIVE')
  from faction_invites i
  join factions f on f.id = i.faction_id
  left join courses c on c.id = f.home_course_id
  where i.code = p_code and i.status = 'ACTIVE' and (i.expires_at is null or i.expires_at > now())
    and auth.uid() is not null;
$$;

revoke all on function join_faction_by_code(text), preview_faction_invite(text) from public;
grant execute on function join_faction_by_code(text), preview_faction_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Courses (shared reference data; users may add and edit only their own)
-- ---------------------------------------------------------------------------
create policy courses_select on courses for select to authenticated using (true);
create policy courses_insert on courses for insert to authenticated with check (created_by = auth.uid());
create policy courses_update on courses for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy courses_delete on courses for delete to authenticated using (created_by = auth.uid());

create policy course_tees_select on course_tees for select to authenticated using (true);
create policy course_tees_write on course_tees for all to authenticated
  using (course_is_owned(course_id)) with check (course_is_owned(course_id));

create policy holes_select on holes for select to authenticated using (true);
create policy holes_write on holes for all to authenticated
  using (course_is_owned(course_id)) with check (course_is_owned(course_id));

create policy tee_holes_select on tee_holes for select to authenticated using (true);
create policy tee_holes_write on tee_holes for all to authenticated
  using (exists (select 1 from holes h where h.id = tee_holes.hole_id and course_is_owned(h.course_id)))
  with check (exists (select 1 from holes h where h.id = tee_holes.hole_id and course_is_owned(h.course_id)));

-- ---------------------------------------------------------------------------
-- Profiles: your own, plus people who share a faction with you
-- ---------------------------------------------------------------------------
create policy profiles_select on profiles for select to authenticated
  using (user_id = auth.uid() or shares_faction_with(user_id));
create policy profiles_insert on profiles for insert to authenticated with check (user_id = auth.uid());
create policy profiles_update on profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Factions
-- ---------------------------------------------------------------------------
create policy factions_select on factions for select to authenticated
  using (is_faction_member(id) or created_by = auth.uid());
create policy factions_insert on factions for insert to authenticated
  with check (created_by = auth.uid());
create policy factions_update on factions for update to authenticated
  using (is_faction_admin(id)) with check (is_faction_admin(id));
create policy factions_delete on factions for delete to authenticated using (is_faction_admin(id));

create policy faction_members_select on faction_members for select to authenticated
  using (is_faction_member(faction_id) or user_id = auth.uid());
-- Admins add/modify members; members join only through join_faction_by_code().
create policy faction_members_insert on faction_members for insert to authenticated
  with check (is_faction_admin(faction_id));
create policy faction_members_update on faction_members for update to authenticated
  using (is_faction_admin(faction_id)) with check (is_faction_admin(faction_id));
create policy faction_members_delete on faction_members for delete to authenticated
  using (is_faction_admin(faction_id) or user_id = auth.uid());

create policy faction_round_templates_select on faction_round_templates for select to authenticated
  using (is_faction_member(faction_id));
create policy faction_round_templates_write on faction_round_templates for all to authenticated
  using (is_faction_admin(faction_id)) with check (is_faction_admin(faction_id));

create policy faction_invites_admin on faction_invites for all to authenticated
  using (is_faction_admin(faction_id))
  with check (is_faction_admin(faction_id) and invited_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Scheduling
-- ---------------------------------------------------------------------------
create policy scheduled_rounds_select on scheduled_rounds for select to authenticated
  using (is_faction_member(faction_id));
create policy scheduled_rounds_write on scheduled_rounds for all to authenticated
  using (is_faction_admin(faction_id)) with check (is_faction_admin(faction_id));

create policy round_rsvps_select on round_rsvps for select to authenticated
  using (is_faction_member(faction_of_scheduled_round(scheduled_round_id)));
create policy round_rsvps_write on round_rsvps for all to authenticated
  using (user_id = auth.uid() and is_faction_member(faction_of_scheduled_round(scheduled_round_id)))
  with check (user_id = auth.uid() and is_faction_member(faction_of_scheduled_round(scheduled_round_id)));

-- ---------------------------------------------------------------------------
-- Rounds
-- ---------------------------------------------------------------------------
create policy rounds_select on rounds for select to authenticated using (can_view_round(id));
-- Solo rounds: anyone. Faction rounds: faction admins only (round.start).
create policy rounds_insert on rounds for insert to authenticated
  with check (created_by = auth.uid() and (faction_id is null or is_faction_admin(faction_id)));
create policy rounds_update on rounds for update to authenticated
  using (can_manage_round(id)) with check (can_manage_round(id));
create policy rounds_delete on rounds for delete to authenticated using (can_manage_round(id));

create policy guest_profiles_select on guest_profiles for select to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from round_players rp
      where rp.guest_profile_id = guest_profiles.id and can_view_round(rp.round_id)
    )
  );
create policy guest_profiles_insert on guest_profiles for insert to authenticated
  with check (created_by = auth.uid());
create policy guest_profiles_update on guest_profiles for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy guest_profiles_delete on guest_profiles for delete to authenticated
  using (created_by = auth.uid());

create policy round_players_select on round_players for select to authenticated
  using (can_view_round(round_id));
create policy round_players_write on round_players for all to authenticated
  using (can_manage_round(round_id)) with check (can_manage_round(round_id));

create policy round_teams_select on round_teams for select to authenticated
  using (can_view_round(round_id));
create policy round_teams_write on round_teams for all to authenticated
  using (can_manage_round(round_id)) with check (can_manage_round(round_id));

create policy round_team_members_select on round_team_members for select to authenticated
  using (exists (select 1 from round_teams t where t.id = team_id and can_view_round(t.round_id)));
create policy round_team_members_write on round_team_members for all to authenticated
  using (exists (select 1 from round_teams t where t.id = team_id and can_manage_round(t.round_id)))
  with check (exists (select 1 from round_teams t where t.id = team_id and can_manage_round(t.round_id)));

-- ---------------------------------------------------------------------------
-- Scores: managers may write any score; players their own; scorers their group.
-- round_id must agree with the player's round so a score cannot be smuggled
-- into a round the writer is allowed to view but not score.
-- ---------------------------------------------------------------------------
create policy score_events_select on score_events for select to authenticated
  using (can_view_round(round_id));
create policy score_events_insert on score_events for insert to authenticated
  with check (
    updated_by = auth.uid()
    and round_id = round_of_player(round_player_id)
    and can_score_player(round_player_id)
  );
create policy score_events_update on score_events for update to authenticated
  using (can_score_player(round_player_id))
  with check (
    updated_by = auth.uid()
    and round_id = round_of_player(round_player_id)
    and can_score_player(round_player_id)
  );
create policy score_events_delete on score_events for delete to authenticated
  using (can_manage_round(round_id));

-- ---------------------------------------------------------------------------
-- Games, results, ledger
-- ---------------------------------------------------------------------------
create policy game_presets_select on game_presets for select to authenticated
  using (owner_id = auth.uid() or (faction_id is not null and is_faction_member(faction_id)));
create policy game_presets_insert on game_presets for insert to authenticated
  with check (owner_id = auth.uid() and (faction_id is null or is_faction_admin(faction_id)));
create policy game_presets_update on game_presets for update to authenticated
  using (owner_id = auth.uid() or (faction_id is not null and is_faction_admin(faction_id)))
  with check (owner_id = auth.uid() or (faction_id is not null and is_faction_admin(faction_id)));
create policy game_presets_delete on game_presets for delete to authenticated
  using (owner_id = auth.uid() or (faction_id is not null and is_faction_admin(faction_id)));

create policy game_instances_select on game_instances for select to authenticated
  using (can_view_round(round_id));
create policy game_instances_write on game_instances for all to authenticated
  using (can_manage_round(round_id)) with check (can_manage_round(round_id));

create policy game_results_select on game_results for select to authenticated
  using (exists (select 1 from game_instances g where g.id = game_instance_id and can_view_round(g.round_id)));
create policy game_results_write on game_results for all to authenticated
  using (exists (select 1 from game_instances g where g.id = game_instance_id and can_manage_round(g.round_id)))
  with check (exists (select 1 from game_instances g where g.id = game_instance_id and can_manage_round(g.round_id)));

create policy ledger_entries_select on ledger_entries for select to authenticated
  using (can_view_round(round_id));
create policy ledger_entries_write on ledger_entries for all to authenticated
  using (can_manage_round(round_id)) with check (can_manage_round(round_id));

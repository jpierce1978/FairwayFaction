-- FairwayFaction core schema (Milestone 1)
-- Mirrors DOMAIN_MAP.md. IDs are client-generated UUIDs so rows created offline keep their identity.
-- (gen_random_uuid() is built into Postgres 13+, so no extension is needed.)
-- Row Level Security is enabled here and policies are defined in 20261005000002_rls_policies.sql.


-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type faction_visibility as enum ('PRIVATE', 'INVITE_ONLY');
create type faction_role as enum ('ADMIN', 'MEMBER');
create type faction_member_status as enum ('ACTIVE', 'INVITED', 'REMOVED');
create type team_method as enum ('RANDOM', 'MANUAL', 'SAVED');
create type invite_status as enum ('ACTIVE', 'USED', 'REVOKED', 'EXPIRED');
create type scheduled_round_status as enum ('UPCOMING', 'OPEN_FOR_RSVP', 'READY', 'CONVERTED_TO_ROUND', 'CANCELLED');
create type rsvp_status as enum ('YES', 'NO', 'MAYBE', 'NO_RESPONSE');
create type round_status as enum ('DRAFT', 'READY', 'ACTIVE', 'FINALIZING', 'COMPLETE', 'CANCELLED');
create type round_player_status as enum ('ACTIVE', 'WITHDRAWN');
create type fairway_result as enum ('LEFT', 'HIT', 'RIGHT');
create type game_instance_status as enum ('PENDING', 'ACTIVE', 'COMPLETE', 'INVALID');
create type game_winner_type as enum ('PLAYER', 'TEAM');
create type ledger_entry_status as enum ('CALCULATED', 'ACKNOWLEDGED', 'VOID');

-- ---------------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Course domain (created first: referenced by profiles, factions, rounds)
-- ---------------------------------------------------------------------------
create table courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  timezone text not null,
  number_of_holes smallint not null check (number_of_holes in (9, 18)),
  -- null = curated/seeded course (read-only to clients); set = user-created course
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table course_tees (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  name text not null,
  color text not null,
  category text,
  rating numeric(4, 1) not null,
  slope smallint not null check (slope between 55 and 155),
  total_yardage integer not null check (total_yardage > 0)
);
create index course_tees_course_idx on course_tees (course_id);

create table holes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  hole_number smallint not null check (hole_number between 1 and 18),
  par smallint not null check (par between 3 and 6),
  unique (course_id, hole_number)
);

create table tee_holes (
  course_tee_id uuid not null references course_tees (id) on delete cascade,
  hole_id uuid not null references holes (id) on delete cascade,
  yardage integer not null check (yardage > 0),
  handicap_index smallint not null check (handicap_index between 1 and 18),
  primary key (course_tee_id, hole_id)
);

-- ---------------------------------------------------------------------------
-- Identity domain. The "User" entity is Supabase's auth.users.
-- ---------------------------------------------------------------------------
create table profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30),
  full_name text,
  avatar_url text,
  home_course_id uuid references courses (id) on delete set null,
  preferred_tee text,
  handicap_index numeric(3, 1) check (handicap_index is null or handicap_index between -10 and 54),
  handicap_provider text,
  handicap_provider_id text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Faction domain
-- ---------------------------------------------------------------------------
create table factions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  home_course_id uuid references courses (id) on delete set null,
  timezone text not null default 'UTC',
  visibility faction_visibility not null default 'INVITE_ONLY',
  created_by uuid not null references auth.users (id),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger factions_updated_at before update on factions
  for each row execute function set_updated_at();

create table faction_members (
  faction_id uuid not null references factions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role faction_role not null default 'MEMBER',
  status faction_member_status not null default 'ACTIVE',
  joined_at timestamptz not null default now(),
  primary key (faction_id, user_id)
);
create index faction_members_user_idx on faction_members (user_id);

create table faction_round_templates (
  id uuid primary key default gen_random_uuid(),
  faction_id uuid not null references factions (id) on delete cascade,
  name text not null,
  course_id uuid not null references courses (id),
  schedule_defaults jsonb not null default '{}'::jsonb,
  default_game_preset_ids uuid[] not null default '{}',
  default_team_method team_method not null default 'RANDOM',
  default_round_settings jsonb not null default '{}'::jsonb
);
create index faction_round_templates_faction_idx on faction_round_templates (faction_id);

create table faction_invites (
  id uuid primary key default gen_random_uuid(),
  faction_id uuid not null references factions (id) on delete cascade,
  code text not null unique check (char_length(code) >= 6),
  invited_by uuid not null references auth.users (id),
  expires_at timestamptz,
  status invite_status not null default 'ACTIVE',
  used_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index faction_invites_faction_idx on faction_invites (faction_id);

-- ---------------------------------------------------------------------------
-- Scheduling domain
-- ---------------------------------------------------------------------------
create table scheduled_rounds (
  id uuid primary key default gen_random_uuid(),
  faction_id uuid not null references factions (id) on delete cascade,
  template_id uuid references faction_round_templates (id) on delete set null,
  scheduled_at timestamptz not null,
  course_id uuid not null references courses (id),
  status scheduled_round_status not null default 'UPCOMING'
);
create index scheduled_rounds_faction_idx on scheduled_rounds (faction_id, scheduled_at);

create table round_rsvps (
  scheduled_round_id uuid not null references scheduled_rounds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status rsvp_status not null default 'NO_RESPONSE',
  updated_at timestamptz not null default now(),
  primary key (scheduled_round_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Round domain
-- ---------------------------------------------------------------------------
create table guest_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30),
  contact jsonb,
  created_by uuid not null references auth.users (id)
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  faction_id uuid references factions (id) on delete set null,
  scheduled_round_id uuid references scheduled_rounds (id) on delete set null,
  course_id uuid not null references courses (id),
  started_at timestamptz,
  completed_at timestamptz,
  status round_status not null default 'DRAFT',
  created_by uuid not null references auth.users (id),
  local_version integer not null default 1,
  cloud_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rounds_faction_idx on rounds (faction_id);
create index rounds_created_by_idx on rounds (created_by);
create trigger rounds_updated_at before update on rounds
  for each row execute function set_updated_at();

create table round_players (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds (id) on delete cascade,
  user_id uuid references auth.users (id),
  guest_profile_id uuid references guest_profiles (id),
  display_name_snapshot text not null,
  tee_id uuid references course_tees (id),
  handicap_snapshot numeric(3, 1),
  scoring_group_id uuid,
  start_order integer not null default 0,
  status round_player_status not null default 'ACTIVE',
  -- exactly one of member / guest
  constraint round_players_identity check ((user_id is null) <> (guest_profile_id is null))
);
create index round_players_round_idx on round_players (round_id);
create index round_players_user_idx on round_players (user_id);

create table round_teams (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds (id) on delete cascade,
  name text not null,
  display_order integer not null default 0
);
create index round_teams_round_idx on round_teams (round_id);

create table round_team_members (
  team_id uuid not null references round_teams (id) on delete cascade,
  round_player_id uuid not null references round_players (id) on delete cascade,
  primary key (team_id, round_player_id)
);

-- ---------------------------------------------------------------------------
-- Scoring domain: ScoreEvent is the single source of truth for golf scores.
-- ---------------------------------------------------------------------------
create table score_events (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds (id) on delete cascade,
  round_player_id uuid not null references round_players (id) on delete cascade,
  hole_id uuid not null references holes (id),
  gross_score smallint not null check (gross_score between 1 and 30),
  putts smallint check (putts is null or putts >= 0),
  fairway_result fairway_result,
  gir boolean,
  penalties smallint check (penalties is null or penalties >= 0),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users (id),
  device_id text not null,
  version integer not null default 1 check (version >= 1),
  -- the unique logical key from DOMAIN_MAP §7
  unique (round_player_id, hole_id)
);
create index score_events_round_idx on score_events (round_id);

-- ---------------------------------------------------------------------------
-- Game engine domain
-- ---------------------------------------------------------------------------
create table game_presets (
  id uuid primary key default gen_random_uuid(),
  faction_id uuid references factions (id) on delete cascade,
  owner_id uuid not null references auth.users (id),
  game_definition_key text not null,
  name text not null,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index game_presets_faction_idx on game_presets (faction_id);

create table game_instances (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds (id) on delete cascade,
  game_definition_key text not null,
  game_definition_version integer not null check (game_definition_version >= 1),
  preset_id uuid references game_presets (id) on delete set null,
  configuration jsonb not null default '{}'::jsonb,
  status game_instance_status not null default 'PENDING'
);
create index game_instances_round_idx on game_instances (round_id);

-- Derived output; may always be recomputed from round + scores + configuration.
create table game_results (
  id uuid primary key default gen_random_uuid(),
  game_instance_id uuid not null references game_instances (id) on delete cascade,
  result_type text not null,
  winner_type game_winner_type not null,
  winner_id uuid not null,
  loser_id uuid,
  unit_count numeric not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb
);
create index game_results_instance_idx on game_results (game_instance_id);

-- ---------------------------------------------------------------------------
-- Ledger domain: neutral obligations. No payment processing.
-- ---------------------------------------------------------------------------
create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds (id) on delete cascade,
  game_instance_id uuid not null references game_instances (id) on delete cascade,
  from_round_player_id uuid not null references round_players (id) on delete cascade,
  to_round_player_id uuid not null references round_players (id) on delete cascade,
  units numeric not null,
  unit_type text not null,
  configured_value numeric,
  display_value text,
  description text not null,
  status ledger_entry_status not null default 'CALCULATED',
  constraint ledger_entries_distinct_parties check (from_round_player_id <> to_round_player_id)
);
create index ledger_entries_round_idx on ledger_entries (round_id);

-- ---------------------------------------------------------------------------
-- RLS on every table (deny by default; policies follow in the next migration)
-- ---------------------------------------------------------------------------
alter table courses enable row level security;
alter table course_tees enable row level security;
alter table holes enable row level security;
alter table tee_holes enable row level security;
alter table profiles enable row level security;
alter table factions enable row level security;
alter table faction_members enable row level security;
alter table faction_round_templates enable row level security;
alter table faction_invites enable row level security;
alter table scheduled_rounds enable row level security;
alter table round_rsvps enable row level security;
alter table guest_profiles enable row level security;
alter table rounds enable row level security;
alter table round_players enable row level security;
alter table round_teams enable row level security;
alter table round_team_members enable row level security;
alter table score_events enable row level security;
alter table game_presets enable row level security;
alter table game_instances enable row level security;
alter table game_results enable row level security;
alter table ledger_entries enable row level security;

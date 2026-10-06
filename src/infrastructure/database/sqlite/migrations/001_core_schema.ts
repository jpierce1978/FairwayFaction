import type { Migration } from '../migrator';

/**
 * Local (on-device) mirror of the core entities in DOMAIN_MAP. SQLite is the
 * source of truth for an active round; Supabase is synchronized from it.
 *
 * Conventions: ids are client-generated UUID TEXT; timestamps are ISO-8601 TEXT;
 * JSON is TEXT; booleans are INTEGER 0/1. Foreign keys are enforced only between
 * a round and the rows it owns; cross-domain references (course_id, user_id, ...)
 * are plain indexed columns so cloud data can be cached in any order.
 */
export const migration001: Migration = {
  id: 1,
  name: 'core_schema',
  sql: `
CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  home_course_id TEXT,
  preferred_tee TEXT,
  handicap_index REAL,
  handicap_provider TEXT,
  handicap_provider_id TEXT,
  preferences TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  timezone TEXT NOT NULL,
  number_of_holes INTEGER NOT NULL CHECK (number_of_holes IN (9, 18))
);

CREATE TABLE course_tees (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  category TEXT,
  rating REAL NOT NULL,
  slope INTEGER NOT NULL,
  total_yardage INTEGER NOT NULL
);
CREATE INDEX idx_course_tees_course ON course_tees(course_id);

CREATE TABLE holes (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  par INTEGER NOT NULL CHECK (par BETWEEN 3 AND 6),
  UNIQUE (course_id, hole_number)
);

CREATE TABLE tee_holes (
  course_tee_id TEXT NOT NULL REFERENCES course_tees(id) ON DELETE CASCADE,
  hole_id TEXT NOT NULL REFERENCES holes(id) ON DELETE CASCADE,
  yardage INTEGER NOT NULL,
  handicap_index INTEGER NOT NULL,
  PRIMARY KEY (course_tee_id, hole_id)
);

CREATE TABLE factions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  home_course_id TEXT,
  timezone TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'INVITE_ONLY' CHECK (visibility IN ('PRIVATE', 'INVITE_ONLY')),
  created_by TEXT NOT NULL,
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE faction_members (
  faction_id TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MEMBER')),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INVITED', 'REMOVED')),
  joined_at TEXT NOT NULL,
  PRIMARY KEY (faction_id, user_id)
);
CREATE INDEX idx_faction_members_user ON faction_members(user_id);

CREATE TABLE faction_round_templates (
  id TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  course_id TEXT NOT NULL,
  schedule_defaults TEXT NOT NULL DEFAULT '{}',
  default_game_preset_ids TEXT NOT NULL DEFAULT '[]',
  default_team_method TEXT NOT NULL DEFAULT 'RANDOM' CHECK (default_team_method IN ('RANDOM', 'MANUAL', 'SAVED')),
  default_round_settings TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE faction_invites (
  id TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL,
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'REVOKED', 'EXPIRED'))
);

CREATE TABLE scheduled_rounds (
  id TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  template_id TEXT,
  scheduled_at TEXT NOT NULL,
  course_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UPCOMING'
    CHECK (status IN ('UPCOMING', 'OPEN_FOR_RSVP', 'READY', 'CONVERTED_TO_ROUND', 'CANCELLED'))
);
CREATE INDEX idx_scheduled_rounds_faction ON scheduled_rounds(faction_id, scheduled_at);

CREATE TABLE round_rsvps (
  scheduled_round_id TEXT NOT NULL REFERENCES scheduled_rounds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('YES', 'NO', 'MAYBE', 'NO_RESPONSE')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scheduled_round_id, user_id)
);

CREATE TABLE guest_profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  contact TEXT,
  created_by TEXT NOT NULL
);

CREATE TABLE rounds (
  id TEXT PRIMARY KEY,
  faction_id TEXT,
  scheduled_round_id TEXT,
  course_id TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'READY', 'ACTIVE', 'FINALIZING', 'COMPLETE', 'CANCELLED')),
  created_by TEXT NOT NULL,
  local_version INTEGER NOT NULL DEFAULT 1,
  cloud_version INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_rounds_status ON rounds(status);

CREATE TABLE round_players (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  user_id TEXT,
  guest_profile_id TEXT,
  display_name_snapshot TEXT NOT NULL,
  tee_id TEXT,
  handicap_snapshot REAL,
  scoring_group_id TEXT,
  start_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'WITHDRAWN')),
  CHECK ((user_id IS NULL) <> (guest_profile_id IS NULL))
);
CREATE INDEX idx_round_players_round ON round_players(round_id);

CREATE TABLE round_teams (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE round_team_members (
  team_id TEXT NOT NULL REFERENCES round_teams(id) ON DELETE CASCADE,
  round_player_id TEXT NOT NULL REFERENCES round_players(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, round_player_id)
);

CREATE TABLE score_events (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  round_player_id TEXT NOT NULL REFERENCES round_players(id) ON DELETE CASCADE,
  hole_id TEXT NOT NULL,
  gross_score INTEGER NOT NULL CHECK (gross_score BETWEEN 1 AND 30),
  putts INTEGER CHECK (putts IS NULL OR putts >= 0),
  fairway_result TEXT CHECK (fairway_result IS NULL OR fairway_result IN ('LEFT', 'HIT', 'RIGHT')),
  gir INTEGER CHECK (gir IS NULL OR gir IN (0, 1)),
  penalties INTEGER CHECK (penalties IS NULL OR penalties >= 0),
  metadata TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  device_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('LOCAL_ONLY', 'PENDING', 'SYNCED', 'CONFLICT')),
  UNIQUE (round_player_id, hole_id)
);
CREATE INDEX idx_score_events_round ON score_events(round_id);

CREATE TABLE game_presets (
  id TEXT PRIMARY KEY,
  faction_id TEXT,
  owner_id TEXT NOT NULL,
  game_definition_key TEXT NOT NULL,
  name TEXT NOT NULL,
  configuration TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE game_instances (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  game_definition_key TEXT NOT NULL,
  game_definition_version INTEGER NOT NULL,
  preset_id TEXT,
  configuration TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'COMPLETE', 'INVALID'))
);
CREATE INDEX idx_game_instances_round ON game_instances(round_id);

-- Derived output. Always replaceable by recomputing from round + scores + configuration.
CREATE TABLE game_results (
  id TEXT PRIMARY KEY,
  game_instance_id TEXT NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  result_type TEXT NOT NULL,
  winner_type TEXT NOT NULL CHECK (winner_type IN ('PLAYER', 'TEAM')),
  winner_id TEXT NOT NULL,
  loser_id TEXT,
  unit_count REAL NOT NULL,
  description TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_game_results_instance ON game_results(game_instance_id);

CREATE TABLE ledger_entries (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  game_instance_id TEXT NOT NULL REFERENCES game_instances(id) ON DELETE CASCADE,
  from_round_player_id TEXT NOT NULL REFERENCES round_players(id) ON DELETE CASCADE,
  to_round_player_id TEXT NOT NULL REFERENCES round_players(id) ON DELETE CASCADE,
  units REAL NOT NULL,
  unit_type TEXT NOT NULL,
  configured_value REAL,
  display_value TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CALCULATED' CHECK (status IN ('CALCULATED', 'ACKNOWLEDGED', 'VOID'))
);
CREATE INDEX idx_ledger_entries_round ON ledger_entries(round_id);

-- Outbound sync queue (SYNCHRONIZATION DOMAIN). Rows are written in the same
-- transaction as the domain change they describe.
CREATE TABLE local_mutations (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('UPSERT', 'DELETE')),
  payload TEXT NOT NULL,
  local_timestamp TEXT NOT NULL,
  device_id TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
  last_error TEXT
);
CREATE INDEX idx_local_mutations_status ON local_mutations(status);
CREATE INDEX idx_local_mutations_entity ON local_mutations(entity_type, entity_id);

-- Small key/value store for device-level facts (device id, last sync time, ...).
CREATE TABLE local_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`,
};

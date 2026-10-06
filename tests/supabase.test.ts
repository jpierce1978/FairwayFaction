import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { join } from 'node:path';
import {
  createMigratedPg,
  U_ADMIN,
  U_MEMBER,
  U_MEMBER2,
  U_STRANGER,
  type TestPg,
} from './helpers/pg';
const __dirname = dirname(fileURLToPath(import.meta.url));

const F1 = '20000000-0000-4000-8000-000000000001';
const COURSE = '30000000-0000-4000-8000-000000000001';
const HOLE1 = '31000000-0000-4000-8000-000000000001';
const ROUND = '40000000-0000-4000-8000-000000000001';
const SOLO = '40000000-0000-4000-8000-000000000002';
const P_MEMBER = '50000000-0000-4000-8000-000000000001';
const P_MEMBER2 = '50000000-0000-4000-8000-000000000002';
const P_ADMIN = '50000000-0000-4000-8000-000000000003';
const GROUP = '60000000-0000-4000-8000-000000000001';

let pg: TestPg;
afterAll(async () => {
  await pg.db.close();
});
const q = <T = Record<string, unknown>>(sql: string) => pg.db.query<T>(sql).then((r) => r.rows);

/** Fixtures are inserted as the superuser (bypassing RLS); the tests then act as real users. */
beforeAll(async () => {
  pg = await createMigratedPg();
  await pg.db.exec(`
    insert into courses (id, name, timezone, number_of_holes) values ('${COURSE}', 'Surrey Hills', 'UTC', 18);
    insert into holes (id, course_id, hole_number, par) values ('${HOLE1}', '${COURSE}', 1, 4);
    insert into factions (id, name, created_by) values ('${F1}', 'Saturday Golf', '${U_ADMIN}');
    insert into faction_members (faction_id, user_id, role) values ('${F1}', '${U_MEMBER}', 'MEMBER'), ('${F1}', '${U_MEMBER2}', 'MEMBER');
    insert into rounds (id, faction_id, course_id, status, created_by) values ('${ROUND}', '${F1}', '${COURSE}', 'ACTIVE', '${U_ADMIN}');
    insert into round_players (id, round_id, user_id, display_name_snapshot, scoring_group_id) values
      ('${P_MEMBER}', '${ROUND}', '${U_MEMBER}', 'Member', '${GROUP}'),
      ('${P_MEMBER2}', '${ROUND}', '${U_MEMBER2}', 'Member2', '${GROUP}'),
      ('${P_ADMIN}', '${ROUND}', '${U_ADMIN}', 'Admin', null);
  `);
});

const denied = (p: Promise<unknown>) =>
  expect(p).rejects.toThrow(/row-level security|permission denied/i);

describe('Supabase migrations', () => {
  it('apply cleanly in filename order on a fresh Postgres', async () => {
    const files = readdirSync(join(__dirname, '../supabase/migrations')).sort();
    expect(files).toEqual(['20261005000001_core_schema.sql', '20261005000002_rls_policies.sql']);
    expect(
      files.every(
        (f) => readFileSync(join(__dirname, '../supabase/migrations', f), 'utf8').length > 0,
      ),
    ).toBe(true);
  });

  it('every public table has RLS enabled and at least one policy (deny-by-default is never accidental)', async () => {
    const rows = await q<{ table: string; rls: boolean; policies: string }>(`
      select c.relname as table, c.relrowsecurity as rls,
             (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'`);
    expect(rows.length).toBeGreaterThanOrEqual(21);
    expect(rows.filter((r) => !r.rls).map((r) => r.table)).toEqual([]);
    expect(rows.filter((r) => Number(r.policies) === 0).map((r) => r.table)).toEqual([]);
  });

  it('covers the DOMAIN_MAP core entities', async () => {
    const names = (
      await q<{ tablename: string }>(`select tablename from pg_tables where schemaname = 'public'`)
    ).map((r) => r.tablename);
    for (const t of [
      'profiles',
      'factions',
      'faction_members',
      'faction_round_templates',
      'faction_invites',
      'scheduled_rounds',
      'round_rsvps',
      'courses',
      'course_tees',
      'holes',
      'tee_holes',
      'rounds',
      'round_players',
      'guest_profiles',
      'round_teams',
      'round_team_members',
      'score_events',
      'game_presets',
      'game_instances',
      'game_results',
      'ledger_entries',
    ]) {
      expect(names).toContain(t);
    }
  });
});

describe('schema constraints (Postgres)', () => {
  it('one score per round player per hole', async () => {
    const insert = (
      id: string,
    ) => `insert into score_events (id, round_id, round_player_id, hole_id, gross_score, updated_by, device_id)
      values ('${id}', '${ROUND}', '${P_ADMIN}', '${HOLE1}', 4, '${U_ADMIN}', 'd')`;
    await pg.db.exec(insert('70000000-0000-4000-8000-000000000001'));
    await expect(pg.db.exec(insert('70000000-0000-4000-8000-000000000002'))).rejects.toThrow(
      /duplicate key/,
    );
    await pg.db.exec(`delete from score_events where round_player_id = '${P_ADMIN}'`);
  });
  it('a round player is exactly one of member or guest', async () => {
    await expect(
      pg.db.exec(
        `insert into round_players (round_id, display_name_snapshot) values ('${ROUND}', 'nobody')`,
      ),
    ).rejects.toThrow(/round_players_identity/);
  });
  it('rejects impossible scores', async () => {
    await expect(
      pg.db
        .exec(`insert into score_events (round_id, round_player_id, hole_id, gross_score, updated_by, device_id)
      values ('${ROUND}', '${P_ADMIN}', '${HOLE1}', 0, '${U_ADMIN}', 'd')`),
    ).rejects.toThrow(/gross_score/);
  });
});

describe('RLS: factions and membership', () => {
  it('anonymous users see nothing', async () => {
    const rows = await pg.as(null, () => q('select * from factions'));
    expect(rows).toEqual([]);
  });
  it('members see their faction; strangers do not', async () => {
    expect(await pg.as(U_MEMBER, () => q('select id from factions'))).toHaveLength(1);
    expect(await pg.as(U_STRANGER, () => q('select id from factions'))).toEqual([]);
  });
  it('creating a faction makes the creator its ADMIN (trigger)', async () => {
    const id = '20000000-0000-4000-8000-0000000000aa';
    await pg.as(U_STRANGER, () =>
      pg.db.exec(
        `insert into factions (id, name, created_by) values ('${id}', 'New Crew', '${U_STRANGER}')`,
      ),
    );
    const role = await pg.as(U_STRANGER, () =>
      q<{ role: string }>(`select role from faction_members where faction_id = '${id}'`),
    );
    expect(role).toEqual([{ role: 'ADMIN' }]);
  });
  it('cannot create a faction on behalf of someone else', async () => {
    await denied(
      pg.as(U_STRANGER, () =>
        pg.db.exec(`insert into factions (name, created_by) values ('Fake', '${U_ADMIN}')`),
      ),
    );
  });
  it('only admins can update a faction', async () => {
    await pg.as(U_MEMBER, () =>
      pg.db.exec(`update factions set name = 'Hacked' where id = '${F1}'`),
    );
    expect(
      (await q<{ name: string }>(`select name from factions where id = '${F1}'`))[0]!.name,
    ).toBe('Saturday Golf');
    await pg.as(U_ADMIN, () =>
      pg.db.exec(`update factions set name = 'Saturday Golf!' where id = '${F1}'`),
    );
    expect(
      (await q<{ name: string }>(`select name from factions where id = '${F1}'`))[0]!.name,
    ).toBe('Saturday Golf!');
    await pg.db.exec(`update factions set name = 'Saturday Golf' where id = '${F1}'`);
  });
  it('members cannot add themselves or promote themselves', async () => {
    await denied(
      pg.as(U_STRANGER, () =>
        pg.db.exec(
          `insert into faction_members (faction_id, user_id) values ('${F1}', '${U_STRANGER}')`,
        ),
      ),
    );
    await pg.as(U_MEMBER, () =>
      pg.db.exec(
        `update faction_members set role = 'ADMIN' where faction_id = '${F1}' and user_id = '${U_MEMBER}'`,
      ),
    );
    expect(
      (
        await q<{ role: string }>(`select role from faction_members where user_id = '${U_MEMBER}'`)
      )[0]!.role,
    ).toBe('MEMBER');
  });
  it('a member can leave; an admin can remove members', async () => {
    await pg.as(U_MEMBER2, () =>
      pg.db.exec(
        `delete from faction_members where faction_id = '${F1}' and user_id = '${U_MEMBER2}'`,
      ),
    );
    expect(
      await q(
        `select 1 from faction_members where user_id = '${U_MEMBER2}' and faction_id = '${F1}'`,
      ),
    ).toHaveLength(0);
    await pg.db.exec(
      `insert into faction_members (faction_id, user_id, role) values ('${F1}', '${U_MEMBER2}', 'MEMBER')`,
    );
  });
});

describe('RLS: invites', () => {
  const CODE = 'SAT-GOLF-1';
  beforeAll(async () => {
    await pg.as(U_ADMIN, () =>
      pg.db.exec(
        `insert into faction_invites (faction_id, code, invited_by) values ('${F1}', '${CODE}', '${U_ADMIN}')`,
      ),
    );
  });
  it('members cannot read or create invites', async () => {
    expect(await pg.as(U_MEMBER, () => q('select * from faction_invites'))).toEqual([]);
    await denied(
      pg.as(U_MEMBER, () =>
        pg.db.exec(
          `insert into faction_invites (faction_id, code, invited_by) values ('${F1}', 'MEMBER-MADE', '${U_MEMBER}')`,
        ),
      ),
    );
  });
  it('a valid code joins the faction as MEMBER via join_faction_by_code', async () => {
    const joined = await pg.as(U_STRANGER, () =>
      q<{ f: string }>(`select join_faction_by_code('${CODE}') as f`),
    );
    expect(joined[0]!.f).toBe(F1);
    expect(
      await q<{ role: string; status: string }>(
        `select role, status from faction_members where user_id = '${U_STRANGER}' and faction_id = '${F1}'`,
      ),
    ).toEqual([{ role: 'MEMBER', status: 'ACTIVE' }]);
    await pg.db.exec(
      `delete from faction_members where user_id = '${U_STRANGER}' and faction_id = '${F1}'`,
    );
  });
  it('previews the faction before joining', async () => {
    const rows = await pg.as(U_STRANGER, () =>
      q<{ faction_name: string; member_count: string }>(
        `select * from preview_faction_invite('${CODE}')`,
      ),
    );
    expect(rows[0]).toMatchObject({ faction_name: 'Saturday Golf' });
    expect(Number(rows[0]!.member_count)).toBeGreaterThanOrEqual(3);
  });
  it('rejects unknown, revoked and expired codes', async () => {
    await expect(pg.as(U_STRANGER, () => q(`select join_faction_by_code('NOPE')`))).rejects.toThrow(
      /invalid or has expired/,
    );
    await pg.db.exec(
      `insert into faction_invites (faction_id, code, invited_by, status) values ('${F1}', 'REVOKED-1', '${U_ADMIN}', 'REVOKED')`,
    );
    await expect(
      pg.as(U_STRANGER, () => q(`select join_faction_by_code('REVOKED-1')`)),
    ).rejects.toThrow(/invalid or has expired/);
    await pg.db.exec(
      `insert into faction_invites (faction_id, code, invited_by, expires_at) values ('${F1}', 'EXPIRED-1', '${U_ADMIN}', now() - interval '1 day')`,
    );
    await expect(
      pg.as(U_STRANGER, () => q(`select join_faction_by_code('EXPIRED-1')`)),
    ).rejects.toThrow(/invalid or has expired/);
  });
  it('a removed member cannot rejoin with an invite', async () => {
    await pg.db.exec(
      `insert into faction_members (faction_id, user_id, status) values ('${F1}', '${U_STRANGER}', 'REMOVED')`,
    );
    await expect(
      pg.as(U_STRANGER, () => q(`select join_faction_by_code('${CODE}')`)),
    ).rejects.toThrow(/cannot rejoin/);
    await pg.db.exec(
      `delete from faction_members where user_id = '${U_STRANGER}' and faction_id = '${F1}'`,
    );
  });
  it('anonymous callers cannot join', async () => {
    await expect(pg.as(null, () => q(`select join_faction_by_code('${CODE}')`))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('RLS: profiles', () => {
  beforeAll(async () => {
    await pg.db.exec(`insert into profiles (user_id, display_name) values
      ('${U_ADMIN}', 'JP'), ('${U_MEMBER}', 'Paul'), ('${U_STRANGER}', 'Rando')`);
  });
  it('you see yourself and people you share a faction with, not strangers', async () => {
    const names = await pg.as(U_MEMBER, () =>
      q<{ display_name: string }>('select display_name from profiles order by 1'),
    );
    expect(names.map((r) => r.display_name)).toEqual(['JP', 'Paul']);
  });
  it('you can only write your own profile', async () => {
    await denied(
      pg.as(U_MEMBER, () =>
        pg.db.exec(
          `insert into profiles (user_id, display_name) values ('${U_MEMBER2}', 'Impostor')`,
        ),
      ),
    );
    await pg.as(U_MEMBER, () =>
      pg.db.exec(`update profiles set display_name = 'Hacked' where user_id = '${U_ADMIN}'`),
    );
    expect(
      (
        await q<{ display_name: string }>(
          `select display_name from profiles where user_id = '${U_ADMIN}'`,
        )
      )[0]!.display_name,
    ).toBe('JP');
  });
  it('enforces display name length at the database level', async () => {
    await expect(
      pg.db.exec(
        `update profiles set display_name = '${'x'.repeat(31)}' where user_id = '${U_ADMIN}'`,
      ),
    ).rejects.toThrow(/display_name/);
  });
});

describe('RLS: rounds', () => {
  it('faction members can view the faction round; strangers cannot', async () => {
    expect(await pg.as(U_MEMBER, () => q('select id from rounds'))).toHaveLength(1);
    expect(await pg.as(U_STRANGER, () => q('select id from rounds'))).toEqual([]);
  });
  it('anyone may create a solo round for themselves, and only they can see it', async () => {
    await pg.as(U_STRANGER, () =>
      pg.db.exec(
        `insert into rounds (id, course_id, created_by) values ('${SOLO}', '${COURSE}', '${U_STRANGER}')`,
      ),
    );
    expect(
      await pg.as(U_STRANGER, () => q(`select id from rounds where id = '${SOLO}'`)),
    ).toHaveLength(1);
    expect(await pg.as(U_MEMBER, () => q(`select id from rounds where id = '${SOLO}'`))).toEqual(
      [],
    );
  });
  it('plain members cannot start a faction round; admins can', async () => {
    await denied(
      pg.as(U_MEMBER, () =>
        pg.db.exec(
          `insert into rounds (faction_id, course_id, created_by) values ('${F1}', '${COURSE}', '${U_MEMBER}')`,
        ),
      ),
    );
    await pg.as(U_ADMIN, () =>
      pg.db.exec(
        `insert into rounds (id, faction_id, course_id, created_by) values ('40000000-0000-4000-8000-0000000000bb', '${F1}', '${COURSE}', '${U_ADMIN}')`,
      ),
    );
  });
  it('cannot spoof created_by', async () => {
    await denied(
      pg.as(U_STRANGER, () =>
        pg.db.exec(`insert into rounds (course_id, created_by) values ('${COURSE}', '${U_ADMIN}')`),
      ),
    );
  });
  it('only managers edit a round', async () => {
    await pg.as(U_MEMBER, () =>
      pg.db.exec(`update rounds set status = 'COMPLETE' where id = '${ROUND}'`),
    );
    expect(
      (await q<{ status: string }>(`select status from rounds where id = '${ROUND}'`))[0]!.status,
    ).toBe('ACTIVE');
    await pg.as(U_ADMIN, () =>
      pg.db.exec(`update rounds set status = 'FINALIZING' where id = '${ROUND}'`),
    );
    await pg.db.exec(`update rounds set status = 'ACTIVE' where id = '${ROUND}'`);
  });
  it('only managers change the roster', async () => {
    await denied(
      pg.as(U_MEMBER, () =>
        pg.db.exec(
          `insert into round_players (round_id, user_id, display_name_snapshot) values ('${ROUND}', '${U_STRANGER}', 'Sneaky')`,
        ),
      ),
    );
  });
  it('guest profiles are visible to people in the same round, not outsiders', async () => {
    const G = '80000000-0000-4000-8000-000000000001';
    await pg.db
      .exec(`insert into guest_profiles (id, display_name, created_by) values ('${G}', 'Bob', '${U_ADMIN}');
      insert into round_players (id, round_id, guest_profile_id, display_name_snapshot) values ('50000000-0000-4000-8000-0000000000ee', '${ROUND}', '${G}', 'Bob');`);
    expect(await pg.as(U_MEMBER, () => q('select id from guest_profiles'))).toHaveLength(1);
    expect(await pg.as(U_STRANGER, () => q('select id from guest_profiles'))).toEqual([]);
  });
});

describe('RLS: scores', () => {
  const score = (player: string, by: string, round = ROUND, gross = 4) =>
    `insert into score_events (round_id, round_player_id, hole_id, gross_score, updated_by, device_id)
     values ('${round}', '${player}', '${HOLE1}', ${gross}, '${by}', 'd')`;
  afterEach(() => pg.db.exec('delete from score_events'));

  it('a player can score themself', async () => {
    await pg.as(U_MEMBER, () => pg.db.exec(score(P_MEMBER, U_MEMBER)));
    expect(await q('select 1 from score_events')).toHaveLength(1);
  });
  it('a scoring-group member can score the rest of their group (foursome scorer)', async () => {
    await pg.as(U_MEMBER, () => pg.db.exec(score(P_MEMBER2, U_MEMBER)));
  });
  it('a player outside the group cannot score someone else', async () => {
    await denied(pg.as(U_MEMBER, () => pg.db.exec(score(P_ADMIN, U_MEMBER))));
  });
  it('strangers cannot score at all', async () => {
    await denied(pg.as(U_STRANGER, () => pg.db.exec(score(P_MEMBER, U_STRANGER))));
  });
  it('the round creator/admin can score or correct anyone', async () => {
    await pg.as(U_ADMIN, () => pg.db.exec(score(P_MEMBER, U_ADMIN)));
  });
  it('updated_by cannot be spoofed', async () => {
    await denied(pg.as(U_MEMBER, () => pg.db.exec(score(P_MEMBER, U_ADMIN))));
  });
  it("round_id must match the player's round", async () => {
    await pg.db.exec(
      `insert into rounds (id, course_id, created_by) values ('${SOLO}', '${COURSE}', '${U_MEMBER}') on conflict do nothing`,
    );
    await denied(pg.as(U_MEMBER, () => pg.db.exec(score(P_MEMBER, U_MEMBER, SOLO))));
  });
  it('members can read scores in their round; outsiders cannot', async () => {
    await pg.db.exec(score(P_MEMBER, U_MEMBER));
    expect(await pg.as(U_MEMBER2, () => q('select id from score_events'))).toHaveLength(1);
    expect(await pg.as(U_STRANGER, () => q('select id from score_events'))).toEqual([]);
  });
  it('a player cannot reassign their score to another player', async () => {
    await pg.db.exec(score(P_MEMBER, U_MEMBER));
    await pg
      .as(U_MEMBER, () => pg.db.exec(`update score_events set round_player_id = '${P_ADMIN}'`))
      .catch(() => undefined);
    expect(
      await q<{ round_player_id: string }>('select round_player_id from score_events'),
    ).toEqual([{ round_player_id: P_MEMBER }]);
  });
  it('only managers delete scores', async () => {
    await pg.db.exec(score(P_MEMBER, U_MEMBER));
    await pg.as(U_MEMBER, () => pg.db.exec('delete from score_events'));
    expect(await q('select 1 from score_events')).toHaveLength(1);
    await pg.as(U_ADMIN, () => pg.db.exec('delete from score_events'));
    expect(await q('select 1 from score_events')).toHaveLength(0);
  });
});

describe('RLS: courses and game data', () => {
  it('courses are readable by any signed-in user but not editable unless user-created', async () => {
    expect(await pg.as(U_STRANGER, () => q('select id from courses'))).toHaveLength(1);
    await pg.as(U_STRANGER, () => pg.db.exec(`update courses set name = 'Hacked'`));
    expect((await q<{ name: string }>('select name from courses'))[0]!.name).toBe('Surrey Hills');
    await denied(
      pg.as(U_STRANGER, () =>
        pg.db.exec(
          `insert into courses (name, timezone, number_of_holes) values ('Mine', 'UTC', 9)`,
        ),
      ),
    );
    await pg.as(U_STRANGER, () =>
      pg.db.exec(
        `insert into courses (name, timezone, number_of_holes, created_by) values ('Mine', 'UTC', 9, '${U_STRANGER}')`,
      ),
    );
  });
  it('game instances/results/ledger follow round visibility and manage rights', async () => {
    const GI = '90000000-0000-4000-8000-000000000001';
    await pg.as(U_ADMIN, () =>
      pg.db.exec(
        `insert into game_instances (id, round_id, game_definition_key, game_definition_version) values ('${GI}', '${ROUND}', 'skins', 1)`,
      ),
    );
    await denied(
      pg.as(U_MEMBER, () =>
        pg.db.exec(
          `insert into game_instances (round_id, game_definition_key, game_definition_version) values ('${ROUND}', 'skins', 1)`,
        ),
      ),
    );
    expect(await pg.as(U_MEMBER, () => q('select id from game_instances'))).toHaveLength(1);
    expect(await pg.as(U_STRANGER, () => q('select id from game_instances'))).toEqual([]);
    await pg.as(U_ADMIN, () =>
      pg.db
        .exec(`insert into ledger_entries (round_id, game_instance_id, from_round_player_id, to_round_player_id, units, unit_type, description)
      values ('${ROUND}', '${GI}', '${P_MEMBER}', '${P_ADMIN}', 1, 'UNIT', 'Skin')`),
    );
    expect(await pg.as(U_MEMBER, () => q('select id from ledger_entries'))).toHaveLength(1);
    expect(await pg.as(U_STRANGER, () => q('select id from ledger_entries'))).toEqual([]);
    await expect(
      pg.db
        .exec(`insert into ledger_entries (round_id, game_instance_id, from_round_player_id, to_round_player_id, units, unit_type, description)
      values ('${ROUND}', '${GI}', '${P_ADMIN}', '${P_ADMIN}', 1, 'UNIT', 'self')`),
    ).rejects.toThrow(/distinct_parties/);
  });
  it('faction-scoped presets are visible to members and writable only by admins', async () => {
    await pg.as(U_ADMIN, () =>
      pg.db.exec(
        `insert into game_presets (faction_id, owner_id, game_definition_key, name) values ('${F1}', '${U_ADMIN}', 'best-ball', 'Saturday Game')`,
      ),
    );
    expect(await pg.as(U_MEMBER, () => q('select name from game_presets'))).toEqual([
      { name: 'Saturday Game' },
    ]);
    expect(await pg.as(U_STRANGER, () => q('select name from game_presets'))).toEqual([]);
    await denied(
      pg.as(U_MEMBER, () =>
        pg.db.exec(
          `insert into game_presets (faction_id, owner_id, game_definition_key, name) values ('${F1}', '${U_MEMBER}', 'skins', 'Mine')`,
        ),
      ),
    );
  });
  it("RSVPs: members set their own, not each other's; outsiders cannot", async () => {
    const SR = 'a0000000-0000-4000-8000-000000000001';
    await pg.db.exec(
      `insert into scheduled_rounds (id, faction_id, scheduled_at, course_id) values ('${SR}', '${F1}', now() + interval '1 day', '${COURSE}')`,
    );
    await pg.as(U_MEMBER, () =>
      pg.db.exec(
        `insert into round_rsvps (scheduled_round_id, user_id, status) values ('${SR}', '${U_MEMBER}', 'YES')`,
      ),
    );
    await denied(
      pg.as(U_MEMBER, () =>
        pg.db.exec(
          `insert into round_rsvps (scheduled_round_id, user_id, status) values ('${SR}', '${U_MEMBER2}', 'YES')`,
        ),
      ),
    );
    await denied(
      pg.as(U_STRANGER, () =>
        pg.db.exec(
          `insert into round_rsvps (scheduled_round_id, user_id, status) values ('${SR}', '${U_STRANGER}', 'YES')`,
        ),
      ),
    );
    expect(await pg.as(U_MEMBER2, () => q('select user_id from round_rsvps'))).toHaveLength(1);
    expect(await pg.as(U_STRANGER, () => q('select user_id from round_rsvps'))).toEqual([]);
  });
});

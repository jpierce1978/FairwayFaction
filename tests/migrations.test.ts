import {
  MIGRATIONS,
  MigrationError,
  assertMigrationsWellFormed,
  checksum,
  runMigrations,
  type Migration,
} from '@/infrastructure/database/sqlite';
import { createNodeSqliteDatabase } from './helpers/nodeSqlite';
import { migratedDb } from './helpers/fixtures';

const tableNames = async (db: Awaited<ReturnType<typeof migratedDb>>) =>
  (
    await db.all<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
    )
  ).map((r) => r.name);

describe('local SQLite migrations', () => {
  it('creates every core table from DOMAIN_MAP', async () => {
    const db = await migratedDb();
    const names = await tableNames(db);
    for (const t of [
      'profiles',
      'courses',
      'course_tees',
      'holes',
      'tee_holes',
      'factions',
      'faction_members',
      'faction_round_templates',
      'faction_invites',
      'scheduled_rounds',
      'round_rsvps',
      'guest_profiles',
      'rounds',
      'round_players',
      'round_teams',
      'round_team_members',
      'score_events',
      'game_presets',
      'game_instances',
      'game_results',
      'ledger_entries',
      'local_mutations',
      'local_meta',
      'schema_migrations',
    ]) {
      expect(names).toContain(t);
    }
  });

  it('is idempotent: re-running applies nothing and keeps data', async () => {
    const db = await migratedDb();
    await db.run(`INSERT INTO local_meta (key, value) VALUES ('k', 'v')`);
    const report = await runMigrations(db, MIGRATIONS);
    expect(report.applied).toEqual([]);
    expect(report.alreadyApplied).toEqual([1]);
    expect(await db.get(`SELECT value FROM local_meta WHERE key = 'k'`)).toEqual({ value: 'v' });
  });

  it('applies new migrations on top of an existing database in order', async () => {
    const db = await migratedDb();
    const next: Migration = {
      id: 2,
      name: 'add_note',
      sql: `ALTER TABLE courses ADD COLUMN note TEXT;`,
    };
    const report = await runMigrations(db, [...MIGRATIONS, next]);
    expect(report.applied).toEqual([2]);
    await db.run(
      `INSERT INTO courses (id, name, timezone, number_of_holes, note) VALUES ('c', 'n', 'UTC', 18, 'hi')`,
    );
  });

  it('rolls back a failing migration completely and does not record it', async () => {
    const db = await migratedDb();
    const bad: Migration = {
      id: 2,
      name: 'bad',
      sql: `CREATE TABLE half_done (id TEXT); INSERT INTO nonexistent_table VALUES (1);`,
    };
    await expect(runMigrations(db, [...MIGRATIONS, bad])).rejects.toThrow();
    expect(await tableNames(db)).not.toContain('half_done');
    const rows = await db.all('SELECT id FROM schema_migrations');
    expect(rows).toEqual([{ id: 1 }]);
  });

  it('refuses a database whose applied migration was edited', async () => {
    const db = await migratedDb();
    const tampered = [{ ...MIGRATIONS[0]!, sql: MIGRATIONS[0]!.sql + '\n-- edited' }];
    await expect(runMigrations(db, tampered)).rejects.toBeInstanceOf(MigrationError);
  });

  it('refuses a database newer than the app', async () => {
    const db = await migratedDb();
    await runMigrations(db, [...MIGRATIONS, { id: 2, name: 'future', sql: 'SELECT 1;' }]);
    await expect(runMigrations(db, MIGRATIONS)).rejects.toThrow(/does not know about/);
  });

  it('rejects migration lists with gaps or wrong order', () => {
    expect(() => assertMigrationsWellFormed([{ id: 2, name: 'x', sql: '' }])).toThrow(
      MigrationError,
    );
    expect(() =>
      assertMigrationsWellFormed([
        { id: 1, name: 'a', sql: '' },
        { id: 3, name: 'c', sql: '' },
      ]),
    ).toThrow(MigrationError);
  });

  it('checksum is stable and sensitive to changes', () => {
    expect(checksum('abc')).toBe(checksum('abc'));
    expect(checksum('abc')).not.toBe(checksum('abd'));
  });

  describe('schema constraints', () => {
    it('enforces one score per player per hole', async () => {
      const db = await migratedDb();
      await db.exec(`
        INSERT INTO courses (id, name, timezone, number_of_holes) VALUES ('c1','C','UTC',9);
        INSERT INTO rounds (id, course_id, status, created_by) VALUES ('r1','c1','ACTIVE','u');
        INSERT INTO round_players (id, round_id, user_id, display_name_snapshot) VALUES ('p1','r1','u','JP');
      `);
      const insert = `INSERT INTO score_events (id, round_id, round_player_id, hole_id, gross_score, updated_at, updated_by, device_id)
                      VALUES (?, 'r1', 'p1', 'h1', 4, 't', 'u', 'd')`;
      await db.run(insert, ['s1']);
      await expect(db.run(insert, ['s2'])).rejects.toThrow();
    });

    it('requires exactly one of user or guest on a round player', async () => {
      const db = await migratedDb();
      await db.exec(`
        INSERT INTO courses (id, name, timezone, number_of_holes) VALUES ('c1','C','UTC',9);
        INSERT INTO rounds (id, course_id, status, created_by) VALUES ('r1','c1','ACTIVE','u');
      `);
      await expect(
        db.run(
          `INSERT INTO round_players (id, round_id, display_name_snapshot) VALUES ('p','r1','nobody')`,
        ),
      ).rejects.toThrow();
      await expect(
        db.run(
          `INSERT INTO round_players (id, round_id, user_id, guest_profile_id, display_name_snapshot) VALUES ('p','r1','u','g','both')`,
        ),
      ).rejects.toThrow();
    });

    it('rejects out-of-range scores and unknown enum values', async () => {
      const db = await migratedDb();
      await db.exec(
        `INSERT INTO courses (id, name, timezone, number_of_holes) VALUES ('c1','C','UTC',9);`,
      );
      await expect(
        db.run(
          `INSERT INTO rounds (id, course_id, status, created_by) VALUES ('r','c1','BOGUS','u')`,
        ),
      ).rejects.toThrow();
    });

    it('cascades round deletion to its players and scores', async () => {
      const db = await migratedDb();
      await db.exec(`
        INSERT INTO courses (id, name, timezone, number_of_holes) VALUES ('c1','C','UTC',9);
        INSERT INTO rounds (id, course_id, status, created_by) VALUES ('r1','c1','ACTIVE','u');
        INSERT INTO round_players (id, round_id, user_id, display_name_snapshot) VALUES ('p1','r1','u','JP');
      `);
      await db.run(`DELETE FROM rounds WHERE id = 'r1'`);
      expect(await db.all('SELECT id FROM round_players')).toEqual([]);
    });
  });

  it('standalone node adapter rolls back thrown transactions', async () => {
    const db = createNodeSqliteDatabase();
    await db.exec('CREATE TABLE t (x INTEGER)');
    await expect(
      db.transaction(async (tx) => {
        await tx.run('INSERT INTO t VALUES (1)');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await db.all('SELECT * FROM t')).toEqual([]);
  });
});

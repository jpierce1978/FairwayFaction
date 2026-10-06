import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS_DIR = join(__dirname, '../../supabase/migrations');

/** Minimal stand-ins for the parts of Supabase the migrations depend on. */
const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, created_at timestamptz not null default now());
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  grant select on auth.users to authenticated;
`;

export const U_ADMIN = '10000000-0000-4000-8000-000000000001';
export const U_MEMBER = '10000000-0000-4000-8000-000000000002';
export const U_STRANGER = '10000000-0000-4000-8000-000000000003';
export const U_MEMBER2 = '10000000-0000-4000-8000-000000000004';

export interface TestPg {
  db: PGlite;
  /** Run `fn` as an authenticated Supabase user (RLS enforced). */
  as<T>(userId: string | null, fn: () => Promise<T>): Promise<T>;
}

export async function createMigratedPg(): Promise<TestPg> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const f of files) await db.exec(readFileSync(join(MIGRATIONS_DIR, f), 'utf8'));
  // Supabase grants table privileges to API roles; RLS then does the filtering.
  await db.exec(`
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  `);
  await db.exec(
    [U_ADMIN, U_MEMBER, U_STRANGER, U_MEMBER2]
      .map((id, i) => `insert into auth.users (id, email) values ('${id}', 'u${i}@example.com');`)
      .join('\n'),
  );

  return {
    db,
    async as(userId, fn) {
      await db.exec(
        userId
          ? `set role authenticated; select set_config('request.jwt.claim.sub', '${userId}', false);`
          : `set role anon;`,
      );
      try {
        return await fn();
      } finally {
        await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
      }
    },
  };
}

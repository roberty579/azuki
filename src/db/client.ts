/**
 * The one place a database connection is created.
 *
 * `server-only` makes a stray import from a Client Component a build error
 * rather than a credential leak (docs/backend.md §5). Nothing in this file, or
 * anything importing it, may ever be reached from the browser.
 */

import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Created on first query, not on import.
 *
 * This matters at build time: `next build` evaluates the module graph to
 * collect route configuration, so anything that connects — or throws about a
 * missing connection string — at module scope makes the build itself require a
 * database. Deferring it keeps `next build` runnable with no environment at
 * all, which is what lets CI build without provisioning Postgres.
 */
let pool: Pool | undefined;
let database: NodePgDatabase<typeof schema> | undefined;

/**
 * Cached across hot reloads in development.
 *
 * Next's dev server re-evaluates modules on every change. Without this cache a
 * fresh Pool is created each time and the old one is never drained, which
 * exhausts Postgres' connection limit within a few minutes of editing.
 */
const globalForDb = globalThis as unknown as {
  pool?: Pool;
  database?: NodePgDatabase<typeof schema>;
};

export function getPool(): Pool {
  const existing = pool ?? globalForDb.pool;
  if (existing) return existing;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Postgres instance.",
    );
  }

  /**
   * A long-lived pool is correct locally and on any long-running Node host
   * (Railway, Fly, a VPS). It is *wrong* on serverless — every invocation would
   * open its own pool and exhaust connections — where a pooler or a serverless
   * driver is needed instead. That swap is this function and nothing else
   * (docs/backend.md §5).
   */
  pool = new Pool({ connectionString });
  if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

  return pool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  const existing = database ?? globalForDb.database;
  if (existing) return existing;

  database = drizzle(getPool(), { schema });
  if (process.env.NODE_ENV !== "production") globalForDb.database = database;

  return database;
}

/**
 * Applies migrations, to either database.
 *
 * drizzle-kit's own `migrate` command reads its target from drizzle.config.ts,
 * which means pointing it at the test database requires swapping an environment
 * variable around a subprocess. Doing it through the programmatic migrator
 * instead keeps one code path and makes `--test` a flag rather than a ritual.
 *
 * Usage:  npm run db:migrate
 *         npm run db:migrate -- --test    (applies to TEST_DATABASE_URL)
 *         npm run db:migrate -- --fresh   (drops the schema first)
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });

const useTestDatabase = process.argv.includes("--test");
const fresh = process.argv.includes("--fresh");
const variable = useTestDatabase ? "TEST_DATABASE_URL" : "DATABASE_URL";
const url = process.env[variable];

if (!url) {
  console.error(`${variable} is not set. Copy .env.example to .env.local first.`);
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool);

async function run() {
  if (fresh) {
    // Drops everything, including the migration history, so the next run
    // applies from scratch. Only useful before there is data worth keeping.
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    console.log(`Dropped and recreated the public schema in ${variable}.`);
  }

  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log(`Migrations applied to ${variable}.`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

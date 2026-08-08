/**
 * Returns the database to a known state: no orders, and stock back to the
 * catalogue's figures.
 *
 * Needed because checkout decrements stock. Without a reset the E2E suite is
 * not repeatable — each run consumes inventory, and a few runs later the
 * fixtures it depends on are sold out. Tests that only pass on a fresh database
 * are worse than no tests, because they fail for reasons unrelated to the code.
 *
 * TRUNCATE rather than DELETE: it resets nothing else, cascades to order_items
 * through the foreign key, and does not care how many rows there are.
 *
 * Usage:  npm run db:reset
 *         npm run db:reset -- --test   (resets TEST_DATABASE_URL instead)
 */

import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });

const useTestDatabase = process.argv.includes("--test");
const variable = useTestDatabase ? "TEST_DATABASE_URL" : "DATABASE_URL";
const url = process.env[variable];

if (!url) {
  console.error(`${variable} is not set.`);
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

async function reset() {
  await pool.query("TRUNCATE orders, order_items RESTART IDENTITY CASCADE");
  console.log(`Cleared orders in ${variable}.`);
}

reset()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

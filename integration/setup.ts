import { config } from "dotenv";

/**
 * Points every integration test at the *test* database, before any module that
 * reads DATABASE_URL is imported.
 *
 * The rewrite matters more than it looks. src/db/client.ts reads
 * `process.env.DATABASE_URL`, so without this the suite would truncate tables
 * in the development database — the one holding whatever you were just looking
 * at in DBeaver. Pointing the variable itself, rather than teaching the client
 * about a second one, keeps the production code free of test-only branches.
 */
config({ path: ".env.local", quiet: true });

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Integration tests refuse to run against the development database.",
  );
}

if (testUrl === process.env.DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL and DATABASE_URL are the same. These tests truncate tables; they must not point at the development database.",
  );
}

process.env.DATABASE_URL = testUrl;

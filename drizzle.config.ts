import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

/**
 * Lives at the repo root because drizzle-kit looks for it here. It only points
 * at the schema and the migration folder — the schema itself is under src/db/.
 *
 * Next loads .env.local into the app automatically; drizzle-kit runs outside
 * Next, so it has to be loaded explicitly.
 */
config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});

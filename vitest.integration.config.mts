import { defineConfig } from "vitest/config";

/**
 * The third test layer: real Postgres, no browser.
 *
 * Separate from vitest.config.mts because the two need opposite environments.
 * Component tests run in jsdom, which has no sockets and where `server-only`
 * throws by design; these run in node, against a database, and are the only
 * place the Server Action's actual behaviour is exercised.
 *
 * `server-only` is aliased away here. It exists to make a stray import from a
 * Client Component fail loudly, which is exactly right in the app and exactly
 * wrong in a test that is deliberately calling server code directly.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": new URL("./integration/server-only-stub.ts", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["integration/**/*.test.ts"],
    setupFiles: ["./integration/setup.ts"],
    // These share one database, so they must not race each other.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});

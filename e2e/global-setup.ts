import { execFileSync } from "node:child_process";

/**
 * Puts the database in a known state once, before the suite runs.
 *
 * This lives in globalSetup rather than in playwright.config's `webServer`
 * command on purpose: `reuseExistingServer` means that command is skipped when
 * a server is already listening, which is the common case locally — and a
 * skipped reset is exactly the situation where stale stock makes the suite fail
 * for reasons that have nothing to do with the code.
 *
 * Clears orders, then re-seeds, which also restores stock to the catalogue's
 * figures. Checkout decrements stock, so without this the suite is only
 * repeatable on a fresh database.
 */
export default function globalSetup() {
  for (const script of ["db:reset", "db:seed"]) {
    /**
     * `shell: true` is required on Windows: npm is a .cmd shim, and since Node
     * 18.20/20.12 execFile refuses to run one directly. The arguments here are
     * hardcoded, so passing them through a shell introduces nothing.
     */
    execFileSync("npm", ["run", script], { stdio: "inherit", shell: true });
  }
}

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Resolves the "@/*" alias from tsconfig.json natively (no vite-tsconfig-paths needed).
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // e2e/ belongs to Playwright; running those specs under Vitest would hang.
    include: ["__tests__/**/*.test.{ts,tsx}"],
  },
});

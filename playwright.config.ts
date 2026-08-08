import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "html" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // The header swaps layouts at 1024px, so cover both sides of that line plus a
  // tablet width that is wide but still collapsed.
  //
  // Layout-specific specs are scoped by filename rather than skipped at runtime,
  // so every project's report is all-green with nothing to mentally filter out:
  //   *.wide.spec.ts    — only where the sections are listed across the top
  //   *.narrow.spec.ts  — only where they collapse behind the hamburger
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /\.narrow\.spec\.ts$/,
    },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 900, height: 900 },
      },
      testIgnore: /\.wide\.spec\.ts$/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
      testIgnore: /\.wide\.spec\.ts$/,
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

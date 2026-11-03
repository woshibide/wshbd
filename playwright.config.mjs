import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: ".cache/playwright-report", open: "never" }],
  ],
  outputDir: ".cache/test-results",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "node build/serve.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
});

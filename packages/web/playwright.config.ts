/**
 * Playwright e2e for the ClinicalCraft web app. The Vite dev server is
 * started on port 5197 (QA mode: no HMR/watch). Chromium runs WebGL through
 * SwiftShader so the three.js world renders headless.
 *
 *   npx playwright test -c packages/web/playwright.config.ts
 *   PW_CHROMIUM=/path/to/chrome  (override the executable)
 *   CC_SHOTS=/dir                (screenshot directory, default test-results/shots)
 */
import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.CC_E2E_PORT || 5197);

function chromiumPath(): string | undefined {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  const candidates = ["/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"];
  return candidates.find((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
}

const executablePath = chromiumPath();

export default defineConfig({
  testDir: path.join(here, "e2e"),
  outputDir: path.join(here, "test-results"),
  timeout: 480_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1280, height: 760 },
    locale: "zh-CN",
    actionTimeout: 30_000,
    navigationTimeout: 120_000,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 760 },
        launchOptions: {
          ...(executablePath ? { executablePath } : {}),
          args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
        },
      },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort --host 127.0.0.1`,
    cwd: here,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { CLINICALCRAFT_QA: "1" },
  },
});

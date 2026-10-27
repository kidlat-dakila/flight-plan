import { join } from "node:path"
import { workspaceRoot } from "@nx/devkit"
import { nxE2EPreset } from "@nx/playwright/preset"
import { defineConfig, devices } from "@playwright/test"

const PROJECT_ROOT = join(workspaceRoot, "tools", "trace-diagram-lab-e2e")
const LAB_ROOT = join(workspaceRoot, "tools", "trace-diagram-lab")
const CONFIG_FILE = "playwright.config.ts"
const LAB_PORT = 4412
const LAB_URL = `http://localhost:${String(LAB_PORT)}`
const FIXTURES_URL = `${LAB_URL}/api/trace-fixtures`
const SERVER_START_TIMEOUT_MS = 120_000
const TEST_TIMEOUT_MS = 90_000
const VIEWPORT = { width: 1600, height: 1000 }
const SCREENSHOT_PATH_TEMPLATE = "{testDir}/__screenshots__/{arg}{ext}"
const MAX_DIFF_PIXEL_RATIO = 0.001
const SCREENSHOT_STYLE_PATH = join(PROJECT_ROOT, "src", "screenshot.css")

export default defineConfig({
  ...nxE2EPreset(join(PROJECT_ROOT, CONFIG_FILE), { testDir: "./src" }),
  timeout: TEST_TIMEOUT_MS,
  snapshotPathTemplate: SCREENSHOT_PATH_TEMPLATE,
  expect: {
    toHaveScreenshot: { animations: "disabled", caret: "hide", maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO, stylePath: SCREENSHOT_STYLE_PATH },
  },
  use: {
    baseURL: LAB_URL,
    trace: "on-first-retry",
    colorScheme: "light",
  },
  webServer: {
    command: `pnpm exec vite --port ${String(LAB_PORT)} --strictPort`,
    cwd: LAB_ROOT,
    url: FIXTURES_URL,
    reuseExistingServer: false,
    timeout: SERVER_START_TIMEOUT_MS,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: VIEWPORT, deviceScaleFactor: 1 },
    },
  ],
})

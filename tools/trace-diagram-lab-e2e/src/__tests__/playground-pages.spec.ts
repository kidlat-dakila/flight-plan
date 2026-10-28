import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { workspaceRoot } from "@nx/devkit"
import { expect, test, type Page } from "@playwright/test"
import { z } from "zod"

const PLAYGROUNDS_FOLDER = join(workspaceRoot, "tools", "trace-diagram-lab", "playgrounds")
const SNAPSHOTS_FOLDER = "snapshots"
const SNAPSHOT_SUFFIX = ".snapshot.json"
const META_FILE = "meta.json"
const PLAYGROUNDS_PATH = "/api/playgrounds"
const PLAYGROUND_PAGE_PATH = "/playground"
const FOLDER_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const BASE_FRAMEWORK = "base"
const ID_SEPARATOR = "/"
const FILE_NAME_PREFIX = "playground-page"
const FILE_NAME_SEPARATOR = "__"
const SCREENSHOT_EXTENSION = ".png"
const READY_TIMEOUT_MS = 30_000
const BEFORE = -1
const AFTER = 1

const playgroundEntriesSchema = z.array(z.object({ id: z.string() }))

const inCodeOrder = (one: string, two: string): number => (one < two ? BEFORE : Number(one > two))

const inFrameworkOrder = (one: string, two: string): number => {
  if (one === two) return 0
  if (one === BASE_FRAMEWORK) return BEFORE
  if (two === BASE_FRAMEWORK) return AFTER
  return inCodeOrder(one, two)
}

const listFolders = (path: string): string[] =>
  existsSync(path)
    ? readdirSync(path, { withFileTypes: true }).filter((entry) => entry.isDirectory() && FOLDER_NAME_PATTERN.test(entry.name)).map((entry) => entry.name)
    : []

const hasSnapshot = (playgroundPath: string): boolean => {
  const snapshotsPath = join(playgroundPath, SNAPSHOTS_FOLDER)
  return existsSync(snapshotsPath) && readdirSync(snapshotsPath).some((file) => file.endsWith(SNAPSHOT_SUFFIX))
}

const isPlayground = (playgroundPath: string): boolean => hasSnapshot(playgroundPath) && existsSync(join(playgroundPath, META_FILE))

const listLanguagePlaygroundIds = (language: string): string[] =>
  [...listFolders(join(PLAYGROUNDS_FOLDER, language))]
    .sort(inFrameworkOrder)
    .filter((framework) => isPlayground(join(PLAYGROUNDS_FOLDER, language, framework)))
    .map((framework) => [language, framework].join(ID_SEPARATOR))

const PLAYGROUND_IDS = [...listFolders(PLAYGROUNDS_FOLDER)].sort(inCodeOrder).flatMap(listLanguagePlaygroundIds)

const NAVIGATION_MINIMUM = 2

const navigationPairsOf = (ids: readonly string[]): (readonly [string, string])[] => {
  const [firstId, secondId] = ids
  return ids.length < NAVIGATION_MINIMUM ? [] : [[firstId, secondId]]
}

const pagePathOf = (playgroundId: string): string => [PLAYGROUND_PAGE_PATH, playgroundId].join(ID_SEPARATOR)

const fileNameOf = (playgroundId: string): string =>
  `${[FILE_NAME_PREFIX, ...playgroundId.split(ID_SEPARATOR)].join(FILE_NAME_SEPARATOR)}${SCREENSHOT_EXTENSION}`

const playgroundReadyOf = (page: Page) => page.getByTestId("playground-ready")

const playgroundLinkOf = (page: Page, playgroundId: string) =>
  page.getByTestId("playground-nav").locator(`[data-testid="playground-link"][data-playground-id="${playgroundId}"]`)

const waitForPlayground = async (page: Page, playgroundId: string): Promise<void> => {
  await expect(playgroundReadyOf(page)).toHaveAttribute("data-playground-id", playgroundId, { timeout: READY_TIMEOUT_MS })
  await page.evaluate(async () => await document.fonts.ready.then(() => true))
}

const expectCurrent = async (page: Page, playgroundId: string): Promise<void> => {
  await expect(page).toHaveURL(new RegExp(`${pagePathOf(playgroundId)}$`))
  await expect(playgroundLinkOf(page, playgroundId)).toHaveAttribute("aria-current", "page")
  await waitForPlayground(page, playgroundId)
}

test("lists the same playgrounds as the lab", async ({ request }) => {
  const response = await request.get(PLAYGROUNDS_PATH)
  const entries = playgroundEntriesSchema.parse(await response.json())
  expect(entries.map((entry) => entry.id)).toEqual(PLAYGROUND_IDS)
})

PLAYGROUND_IDS.forEach((playgroundId) => {
  test(`playground/${playgroundId}`, async ({ page }) => {
    await page.goto(pagePathOf(playgroundId))
    await waitForPlayground(page, playgroundId)
    await expect(page).toHaveScreenshot(fileNameOf(playgroundId), { fullPage: true })
  })
})

navigationPairsOf(PLAYGROUND_IDS).forEach(([firstId, secondId]) => {
  test("navigates between playgrounds from the top bar and back with the browser", async ({ page }) => {
    await page.goto(pagePathOf(firstId))
    await expectCurrent(page, firstId)

    await playgroundLinkOf(page, secondId).click()
    await expectCurrent(page, secondId)
    await expect(playgroundLinkOf(page, firstId)).not.toHaveAttribute("aria-current", "page")

    await page.goBack()
    await expectCurrent(page, firstId)
  })
})

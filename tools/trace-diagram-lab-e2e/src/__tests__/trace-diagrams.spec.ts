import { readdirSync } from "node:fs"
import { join } from "node:path"
import { workspaceRoot } from "@nx/devkit"
import { expect, test, type Page } from "@playwright/test"
import { z } from "zod"

interface FixtureFolder {
  readonly source: string
  readonly path: string
}

const FIXTURE_FOLDERS: readonly FixtureFolder[] = [
  { source: "playground", path: join(workspaceRoot, "tools", "playground-fixtures", "test-cases") },
  { source: "lab", path: join(workspaceRoot, "tools", "trace-diagram-lab", "cases") },
]
const SNAPSHOTS_FOLDER = "snapshots"
const SNAPSHOT_SUFFIX = ".snapshot.json"
const FIXTURES_PATH = "/api/trace-fixtures"
const ID_SEPARATOR = "/"
const FILE_NAME_SEPARATOR = "__"
const SCREENSHOT_EXTENSION = ".png"
const SINGLE_DIAGRAM = "only"
const BAND_TIMEOUT_MS = 30_000

const fixtureEntriesSchema = z.array(z.object({ id: z.string() }))

const isVisibleFolder = (name: string): boolean => !name.startsWith(".") && !name.startsWith("_")

const listKinds = (path: string): string[] =>
  readdirSync(path, { withFileTypes: true }).filter((entry) => entry.isDirectory() && isVisibleFolder(entry.name)).map((entry) => entry.name).sort()

const listSnapshotNames = (kindPath: string): string[] =>
  readdirSync(join(kindPath, SNAPSHOTS_FOLDER))
    .filter((file) => file.endsWith(SNAPSHOT_SUFFIX))
    .map((file) => file.slice(0, -SNAPSHOT_SUFFIX.length))
    .sort()

const listFixtureIds = ({ source, path }: FixtureFolder): string[] =>
  listKinds(path).flatMap((kind) => listSnapshotNames(join(path, kind)).map((name) => [source, kind, name].join(ID_SEPARATOR)))

const FIXTURE_IDS = FIXTURE_FOLDERS.flatMap(listFixtureIds)

const fileNameOf = (fixtureId: string, diagramId: string): string =>
  `${[...fixtureId.split(ID_SEPARATOR), ...diagramId.split(ID_SEPARATOR)].join(FILE_NAME_SEPARATOR)}${SCREENSHOT_EXTENSION}`

const bandReadyOf = (page: Page) => page.getByTestId("band-ready")

const diagramSelectOf = (page: Page) => page.getByTestId("diagram-select").locator("select")

const waitForPaint = async (page: Page): Promise<void> => {
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.evaluate(async () => await document.fonts.ready.then(() => true))
}

const waitForBand = async (page: Page, fixtureId: string): Promise<void> => {
  await expect(bandReadyOf(page)).toHaveAttribute("data-fixture-id", fixtureId, { timeout: BAND_TIMEOUT_MS })
  await waitForPaint(page)
}

const waitForDiagram = async (page: Page, diagramId: string): Promise<void> => {
  await expect(bandReadyOf(page)).toHaveAttribute("data-diagram-id", diagramId, { timeout: BAND_TIMEOUT_MS })
  await waitForPaint(page)
}

const listDiagramIds = async (page: Page): Promise<string[]> =>
  (await diagramSelectOf(page).count()) === 0
    ? [SINGLE_DIAGRAM]
    : await diagramSelectOf(page).locator("option").evaluateAll((options) => options.map((option) => option.getAttribute("value") ?? ""))

const openDiagram = async (page: Page, diagramId: string): Promise<void> => {
  if (diagramId === SINGLE_DIAGRAM) return
  await diagramSelectOf(page).selectOption(diagramId)
  await waitForDiagram(page, diagramId)
}

test("lists the same fixtures as the lab", async ({ request }) => {
  const response = await request.get(FIXTURES_PATH)
  const entries = fixtureEntriesSchema.parse(await response.json())
  expect(entries.map((entry) => entry.id)).toEqual(FIXTURE_IDS)
})

FIXTURE_IDS.forEach((fixtureId) => {
  test(fixtureId, async ({ page }) => {
    await page.goto(`/?fixture=${encodeURIComponent(fixtureId)}`)
    await waitForBand(page, fixtureId)
    const diagramIds = await listDiagramIds(page)
    await diagramIds.reduce(async (previous, diagramId) => {
      await previous
      await openDiagram(page, diagramId)
      await expect(page).toHaveScreenshot(fileNameOf(fixtureId, diagramId))
    }, Promise.resolve())
  })
})

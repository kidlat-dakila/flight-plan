import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { FileTargetMemoryStore } from "@/utils/target-memory-file-store"

const NOW = new Date("2026-10-01T10:00:00.000Z")
const LATER = new Date("2026-10-02T10:00:00.000Z")

const withDataPath = async (test: (dataPath: string) => Promise<void>): Promise<void> => {
  const dataPath = await mkdtemp(join(tmpdir(), "flightplan-target-memory-"))
  try {
    await test(dataPath)
  } finally {
    await rm(dataPath, { recursive: true, force: true })
  }
}

describe("FileTargetMemoryStore", () => {
  it("starts the memory of a repository now and keeps that start", async () => {
    await withDataPath(async (dataPath) => {
      const store = new FileTargetMemoryStore(dataPath)

      await store.ensure("storefront", NOW)

      await expect(store.ensure("storefront", LATER)).resolves.toStrictEqual({ baselineAt: NOW, dismissedTargetIds: [], addedTargets: [] })
    })
  })

  it("writes the memory under the repository's folder", async () => {
    await withDataPath(async (dataPath) => {
      await new FileTargetMemoryStore(dataPath).ensure("storefront", NOW)

      await expect(readFile(join(dataPath, "storefront", "targets.json"), "utf8")).resolves.toContain("\"baselineAt\": \"2026-10-01T10:00:00.000Z\"")
    })
  })

  it("remembers a dismissed target", async () => {
    await withDataPath(async (dataPath) => {
      const store = new FileTargetMemoryStore(dataPath)

      await store.dismiss("storefront", "pr-9", NOW)

      await expect(store.ensure("storefront", LATER)).resolves.toStrictEqual({ baselineAt: NOW, dismissedTargetIds: ["pr-9"], addedTargets: [] })
    })
  })

  it("remembers an added target once", async () => {
    await withDataPath(async (dataPath) => {
      const store = new FileTargetMemoryStore(dataPath)

      await store.add("storefront", { kind: "pull-request", number: 9, author: "mira" }, NOW)
      await store.add("storefront", { kind: "pull-request", number: 9, author: "mira" }, LATER)
      await store.add("storefront", { kind: "branch", name: "spike/returns" }, LATER)

      await expect(store.ensure("storefront", LATER)).resolves.toStrictEqual({
        baselineAt: NOW,
        dismissedTargetIds: [],
        addedTargets: [{ kind: "pull-request", number: 9, author: "mira" }, { kind: "branch", name: "spike/returns" }],
      })
    })
  })

  it("reads a memory stored before targets could be added", async () => {
    await withDataPath(async (dataPath) => {
      await mkdir(join(dataPath, "storefront"))
      await writeFile(
        join(dataPath, "storefront", "targets.json"),
        JSON.stringify({ baselineAt: NOW.toISOString(), dismissedTargetIds: ["pr-9"] }),
      )

      await expect(new FileTargetMemoryStore(dataPath).ensure("storefront", LATER)).resolves.toStrictEqual({
        baselineAt: NOW,
        dismissedTargetIds: ["pr-9"],
        addedTargets: [],
      })
    })
  })

  it("starts again when the stored memory cannot be read", async () => {
    await withDataPath(async (dataPath) => {
      await mkdir(join(dataPath, "storefront"))
      await writeFile(join(dataPath, "storefront", "targets.json"), "not json")

      await expect(new FileTargetMemoryStore(dataPath).ensure("storefront", NOW)).resolves.toStrictEqual({
        baselineAt: NOW,
        dismissedTargetIds: [],
        addedTargets: [],
      })
    })
  })

  it.each(["..", ".", "a/b", "a\\b", ""])("keeps the memory of the unsafe name %j out of the file system", async (name) => {
    await withDataPath(async (dataPath) => {
      const store = new FileTargetMemoryStore(dataPath)

      await store.dismiss(name, "pr-1", NOW)

      await expect(store.ensure(name, LATER)).resolves.toStrictEqual({ baselineAt: LATER, dismissedTargetIds: [], addedTargets: [] })
    })
  })
})

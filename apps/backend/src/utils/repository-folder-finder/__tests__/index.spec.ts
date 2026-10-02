import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
  createRepositoryFolderFinder,
  MAX_SCAN_DEPTH,
  REPOSITORY_CACHE_MS,
} from "@/utils/repository-folder-finder"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

const STARTED_AT = new Date("2026-10-02T12:00:00.000Z")

class FakeClock {
  private currentTime = STARTED_AT

  public readonly now = (): Date => this.currentTime

  public readonly advanceTo = (time: Date): void => {
    this.currentTime = time
  }
}

const makeRepository = async (...segments: readonly string[]): Promise<string> => {
  const repositoryPath = join(...segments)
  await mkdir(join(repositoryPath, ".git"), { recursive: true })
  return repositoryPath
}

const findSortedPaths = async (rootPath: string): Promise<readonly string[]> => {
  const index = await createRepositoryFolderFinder({ rootPath, now: () => STARTED_AT })()
  return [...index.paths].sort()
}

describe("createRepositoryFolderFinder", () => {
  it("finds the folders below the root that hold a .git folder", async () => {
    await withTemporaryFolder(async (rootPath) => {
      const storefront = await makeRepository(rootPath, "projects", "storefront")
      const mobileApp = await makeRepository(rootPath, "work", "team", "mobile-app")
      await mkdir(join(rootPath, "projects", "meeting-notes"), { recursive: true })

      await expect(findSortedPaths(rootPath)).resolves.toStrictEqual([mobileApp, storefront].sort())
    })
  })

  it("answers with the root it searched", async () => {
    await withTemporaryFolder(async (rootPath) => {
      const index = await createRepositoryFolderFinder({ rootPath, now: () => STARTED_AT })()

      expect(index).toStrictEqual({ rootPath, paths: [] })
    })
  })

  it("finds a worktree or submodule, whose .git is a file", async () => {
    await withTemporaryFolder(async (rootPath) => {
      await mkdir(join(rootPath, "worktree"))
      await writeFile(join(rootPath, "worktree", ".git"), "gitdir: ../main/.git/worktrees/worktree")

      await expect(findSortedPaths(rootPath)).resolves.toStrictEqual([join(rootPath, "worktree")])
    })
  })

  it("does not look inside a repository", async () => {
    await withTemporaryFolder(async (rootPath) => {
      const storefront = await makeRepository(rootPath, "storefront")
      await makeRepository(storefront, "node_modules", "left-pad")
      await makeRepository(storefront, "packages", "checkout")

      await expect(findSortedPaths(rootPath)).resolves.toStrictEqual([storefront])
    })
  })

  it("still looks inside a root that is itself a repository", async () => {
    await withTemporaryFolder(async (rootPath) => {
      await mkdir(join(rootPath, ".git"))
      const storefront = await makeRepository(rootPath, "storefront")

      await expect(findSortedPaths(rootPath)).resolves.toStrictEqual([storefront])
    })
  })

  it.each([".cache", ".pnpm-store", "node_modules", "Library", "Applications", "AppData"])(
    "skips the %s folder",
    async (skippedName) => {
      await withTemporaryFolder(async (rootPath) => {
        await makeRepository(rootPath, skippedName, "inside")
        const storefront = await makeRepository(rootPath, "storefront")

        await expect(findSortedPaths(rootPath)).resolves.toStrictEqual([storefront])
      })
    },
  )

  it("finds a repository at the deepest level it searches and none below", async () => {
    await withTemporaryFolder(async (rootPath) => {
      const levelNames = Array.from({ length: MAX_SCAN_DEPTH + 1 }, (_unused, level) => `level-${String(level)}`)
      const deepest = await makeRepository(rootPath, ...levelNames.slice(0, MAX_SCAN_DEPTH))
      await makeRepository(rootPath, ...levelNames)

      await expect(findSortedPaths(rootPath)).resolves.toStrictEqual([deepest])
    })
  })

  it("has nothing for a root that cannot be read", async () => {
    await withTemporaryFolder(async (rootPath) => {
      await expect(findSortedPaths(join(rootPath, "missing"))).resolves.toStrictEqual([])
    })
  })

  it("keeps its answer until the cache time has passed", async () => {
    await withTemporaryFolder(async (rootPath) => {
      const clock = new FakeClock()
      const findRepositoryFolders = createRepositoryFolderFinder({ rootPath, now: clock.now })
      await findRepositoryFolders()
      const storefront = await makeRepository(rootPath, "storefront")

      clock.advanceTo(new Date(STARTED_AT.getTime() + REPOSITORY_CACHE_MS - 1))
      await expect(findRepositoryFolders()).resolves.toMatchObject({ paths: [] })

      clock.advanceTo(new Date(STARTED_AT.getTime() + REPOSITORY_CACHE_MS))
      await expect(findRepositoryFolders()).resolves.toMatchObject({ paths: [storefront] })
    })
  })

  it("searches once when asked twice at the same time", async () => {
    await withTemporaryFolder(async (rootPath) => {
      const findRepositoryFolders = createRepositoryFolderFinder({ rootPath, now: () => STARTED_AT })
      const [first, second] = await Promise.all([findRepositoryFolders(), findRepositoryFolders()])

      expect(second).toBe(first)
    })
  })
})

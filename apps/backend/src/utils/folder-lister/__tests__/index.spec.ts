import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { createFolderLister, isFolder, isRepositoryFolder, readFolderEntries } from "@/utils/folder-lister"
import { withTemporaryFolder } from "@/utils/text-file/__tests__/temporary-folder"

describe("createFolderLister", () => {
  it("lists the folders inside a folder, hidden ones too, and tells which are repositories", async () => {
    await withTemporaryFolder(async (folder) => {
      await mkdir(join(folder, "storefront", ".git"), { recursive: true })
      await mkdir(join(folder, ".claude"))
      await writeFile(join(folder, "notes.txt"), "")

      const listing = await createFolderLister(folder)(folder)

      expect(listing?.path).toBe(folder)
      expect(listing?.parentPath).toBe(dirname(folder))
      expect([...(listing?.folders ?? [])].sort((first, second) => first.name.localeCompare(second.name))).toStrictEqual([
        { name: ".claude", path: join(folder, ".claude"), isRepository: false },
        { name: "storefront", path: join(folder, "storefront"), isRepository: true },
      ])
    })
  })

  it("lists the home folder when no path is given", async () => {
    await withTemporaryFolder(async (homePath) => {
      await expect(createFolderLister(homePath)(null)).resolves.toMatchObject({ path: homePath, folders: [] })
    })
  })

  it("has no parent for the root folder", async () => {
    await expect(createFolderLister("/")(null)).resolves.toMatchObject({ path: "/", parentPath: null })
  })

  it("has nothing for a folder that does not exist", async () => {
    await withTemporaryFolder(async (folder) => {
      await expect(createFolderLister(folder)(join(folder, "missing"))).resolves.toBeNull()
    })
  })
})

describe("isRepositoryFolder", () => {
  it("tells a git repository from a plain folder", async () => {
    await withTemporaryFolder(async (folder) => {
      await mkdir(join(folder, ".git"))

      await expect(isRepositoryFolder(folder)).resolves.toBe(true)
      await expect(isRepositoryFolder(join(folder, ".git"))).resolves.toBe(false)
    })
  })
})

describe("isFolder", () => {
  it("tells a folder from a file and from nothing", async () => {
    await withTemporaryFolder(async (folder) => {
      await writeFile(join(folder, "notes.txt"), "")

      await expect(isFolder(folder)).resolves.toBe(true)
      await expect(isFolder(join(folder, "notes.txt"))).resolves.toBe(false)
      await expect(isFolder(join(folder, "missing"))).resolves.toBe(false)
    })
  })
})

describe("readFolderEntries", () => {
  it("names the files and folders inside a folder, and has nothing for a path that is not a folder", async () => {
    await withTemporaryFolder(async (folder) => {
      await writeFile(join(folder, "settings.json"), "{}")
      await mkdir(join(folder, "plugins"))

      await expect(readFolderEntries(folder)).resolves.toStrictEqual(["plugins", "settings.json"])
      await expect(readFolderEntries(join(folder, "settings.json"))).resolves.toBeNull()
      await expect(readFolderEntries(join(folder, "missing"))).resolves.toBeNull()
    })
  })
})

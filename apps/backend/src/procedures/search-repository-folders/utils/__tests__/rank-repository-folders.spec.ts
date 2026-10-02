import { rankRepositoryFolders } from "@/procedures/search-repository-folders/utils/rank-repository-folders"

const ROOT_PATH = "/Users/dev"

describe("rankRepositoryFolders", () => {
  it("finds a folder by letters spread across its name", async () => {
    const paths = ["/Users/dev/projects/payments-service", "/Users/dev/projects/flight-plan"]

    await expect(rankRepositoryFolders(paths, "pmtsvc", ROOT_PATH)).resolves.toStrictEqual(["/Users/dev/projects/payments-service"])
  })

  it("ignores letter case", async () => {
    await expect(rankRepositoryFolders(["/Users/dev/projects/Storefront"], "STOREF", ROOT_PATH)).resolves.toStrictEqual([
      "/Users/dev/projects/Storefront",
    ])
  })

  it("puts the closer match first", async () => {
    const paths = ["/Users/dev/archive/f-l-i-g-h-t-notes", "/Users/dev/projects/flight-plan"]

    await expect(rankRepositoryFolders(paths, "flight", ROOT_PATH)).resolves.toStrictEqual([
      "/Users/dev/projects/flight-plan",
      "/Users/dev/archive/f-l-i-g-h-t-notes",
    ])
  })

  it("prefers a match in the folder's own name over one in a parent folder", async () => {
    const paths = ["/Users/dev/payments/archive-repo", "/Users/dev/archive/payments"]

    await expect(rankRepositoryFolders(paths, "payments", ROOT_PATH)).resolves.toStrictEqual([
      "/Users/dev/archive/payments",
      "/Users/dev/payments/archive-repo",
    ])
  })

  it("does not match the letters of the root folder", async () => {
    await expect(rankRepositoryFolders(["/Users/dev/projects/storefront"], "dev", ROOT_PATH)).resolves.toStrictEqual([])
  })

  it("keeps a folder outside the root and matches its whole path", async () => {
    await expect(rankRepositoryFolders(["/Volumes/work/ledger-api"], "ledger", ROOT_PATH)).resolves.toStrictEqual([
      "/Volumes/work/ledger-api",
    ])
  })

  it("returns nothing when no folder matches", async () => {
    await expect(rankRepositoryFolders(["/Users/dev/projects/storefront"], "zzz", ROOT_PATH)).resolves.toStrictEqual([])
  })
})

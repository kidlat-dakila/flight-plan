import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"

describe("the mock setup environment", () => {
  it("lists the home folder when no path is given, with its parent", async () => {
    const listing = await createMockSetupEnvironment().listFolders(null)

    expect(listing?.path).toBe("/Users/dev")
    expect(listing?.parentPath).toBe("/Users")
    expect(listing?.folders.map((folder) => folder.name)).toStrictEqual(["Documents", "projects", "work"])
  })

  it("has no listing for a folder that does not exist", async () => {
    await expect(createMockSetupEnvironment().listFolders("/nowhere")).resolves.toBeNull()
  })

  it("finds only folders that are repositories", async () => {
    const environment = createMockSetupEnvironment()

    await expect(environment.searchRepositoryFolders("Checkout")).resolves.toStrictEqual([
      "/Users/dev/projects/checkout-web",
    ])
    await expect(environment.searchRepositoryFolders("meeting-notes")).resolves.toStrictEqual([])
  })

  it("identifies an author by email on local git and by handle on a forge", async () => {
    const environment = createMockSetupEnvironment()
    const repositoryPath = "/Users/dev/projects/checkout-web"

    await expect(environment.searchAuthors({ repositoryPath, forge: "git" }, "lena")).resolves.toStrictEqual([
      { id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", avatarUrl: null },
    ])
    await expect(environment.findAuthor({ repositoryPath, forge: "gh" }, "@lena")).resolves.toMatchObject({
      name: "Lena Okafor",
    })
    await expect(environment.findAuthor({ repositoryPath, forge: "gh" }, "@nobody")).resolves.toBeNull()
  })
})

import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"

describe("the mock setup environment", () => {
  it("lists the home folder when no path is given, with its parent", async () => {
    const listing = await createMockSetupEnvironment().listFolders(null)

    expect(listing?.path).toBe("/Users/dev")
    expect(listing?.parentPath).toBe("/Users")
    expect(listing?.folders.map((folder) => folder.name)).toStrictEqual([".claude", ".codex", "Documents", "projects", "work"])
  })

  it("has no listing for a folder that does not exist", async () => {
    await expect(createMockSetupEnvironment().listFolders("/nowhere")).resolves.toBeNull()
  })

  it("finds only folders that are repositories, below the home folder", async () => {
    const { rootPath, paths } = await createMockSetupEnvironment().findRepositoryFolders()

    expect(rootPath).toBe("/Users/dev")
    expect(paths).toContain("/Users/dev/projects/checkout-web")
    expect(paths).not.toContain("/Users/dev/projects/meeting-notes")
  })

  it("searches users by name or username, and not by the email's domain", async () => {
    const environment = createMockSetupEnvironment()
    const source = { repositoryPath: "/Users/dev/projects/checkout-web", forge: "gh" as const, forges: null }

    await expect(environment.searchAuthors(source, "okafor")).resolves.toMatchObject({ authors: [{ name: "Lena Okafor" }] })
    await expect(environment.searchAuthors(source, "@teo")).resolves.toMatchObject({ authors: [{ name: "Teo Marchetti" }] })
    await expect(environment.searchAuthors({ ...source, forge: "git" }, "acme")).resolves.toStrictEqual({ authors: [], problem: null })
  })

  it("identifies an author by email on local git and by handle on a forge", async () => {
    const environment = createMockSetupEnvironment()
    const repositoryPath = "/Users/dev/projects/checkout-web"

    await expect(environment.searchAuthors({ repositoryPath, forge: "git", forges: null }, "lena")).resolves.toStrictEqual({
      authors: [{ id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", avatarUrl: null }],
      problem: null,
    })
    await expect(environment.findAuthor({ repositoryPath, forge: "gh", forges: null }, "@lena")).resolves.toMatchObject({
      name: "Lena Okafor",
    })
    await expect(environment.findAuthor({ repositoryPath, forge: "gh", forges: null }, "@nobody")).resolves.toBeNull()
  })
})

describe("the mock setup environment's branches", () => {
  it("detects the main branch of a repository folder, and none of another folder", async () => {
    const environment = createMockSetupEnvironment()

    await expect(environment.detectMainBranch("/Users/dev/projects/checkout-web")).resolves.toBe("main")
    await expect(environment.detectMainBranch("/Users/dev/projects/payments-service")).resolves.toBe("master")
    await expect(environment.detectMainBranch("/Users/dev/projects/meeting-notes")).resolves.toBeNull()
  })

  it("lists the branches of a repository folder with their main branch, and none of another folder", async () => {
    const environment = createMockSetupEnvironment()

    const branches = await environment.listBranches("/Users/dev/projects/checkout-web")

    expect(branches?.map((branch) => branch.name)).toContain("main")
    expect(branches?.map((branch) => branch.name)).toContain("develop")
    await expect(environment.listBranches("/Users/dev/projects/meeting-notes")).resolves.toBeNull()
  })
})

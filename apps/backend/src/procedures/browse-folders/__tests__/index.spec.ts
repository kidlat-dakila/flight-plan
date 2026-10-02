import { browseFolders } from "@/procedures/browse-folders"
import { createSetupContext, READY_TO_FINISH, STOREFRONT } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"

describe("browseFolders", () => {
  it("opens the home folder when no path is given", async () => {
    await expect(browseFolders({ path: null, purpose: "repository" }, createSetupContext(EMPTY_SETUP))).resolves.toMatchObject({
      path: "/Users/dev",
      parentPath: "/Users",
      folders: [{ name: "Documents", kind: "folder" }, { name: "projects" }, { name: "work" }],
    })
  })

  it("marks the repositories the setup holds and the ones Flight Plan already lists", async () => {
    const browser = await browseFolders(
      { path: "/Users/dev/projects", purpose: "repository" },
      createSetupContext(READY_TO_FINISH, [STOREFRONT]),
    )

    expect(browser?.folders.map((folder) => [folder.name, folder.kindLabel])).toStrictEqual([
      ["archive", "Folder"],
      ["checkout-web", "Added"],
      ["design-tokens", "Repository"],
      ["docs-site", "Repository"],
      ["flight-plan", "Repository"],
      ["ledger-api", "Repository"],
      ["meeting-notes", "Folder"],
      ["payments-service", "Repository"],
      ["storefront", "Already in Flight Plan"],
    ])
  })

  it("has nothing for a folder that does not exist", async () => {
    await expect(browseFolders({ path: "/nowhere", purpose: "repository" }, createSetupContext(EMPTY_SETUP))).resolves.toBeNull()
  })

  it("opens the home folder when the install folder typed so far does not exist", async () => {
    await expect(
      browseFolders({ path: "/Users/dev/.cursor", purpose: "install-folder" }, createSetupContext(EMPTY_SETUP)),
    ).resolves.toMatchObject({ path: "/Users/dev" })
  })
})

import { buildFolderBrowser } from "@/procedures/browse-folders/utils/build-folder-browser"
import { NO_ADDED_PATHS } from "@/procedures/get-setup/utils/added-paths"

describe("buildFolderBrowser", () => {
  it("lists the folders by name and tells a repository from a plain folder", () => {
    const browser = buildFolderBrowser(
      {
        path: "/work",
        parentPath: "/",
        folders: [
          { name: "notes", path: "/work/notes", isRepository: false },
          { name: "checkout-web", path: "/work/checkout-web", isRepository: true },
        ],
      },
      NO_ADDED_PATHS,
    )

    expect(browser).toStrictEqual({
      path: "/work",
      parentPath: "/",
      folders: [
        { name: "checkout-web", path: "/work/checkout-web", kind: "repository", kindLabel: "Repository" },
        { name: "notes", path: "/work/notes", kind: "folder", kindLabel: "Folder" },
      ],
      message: null,
    })
  })

  it("says whether a repository was added in the setup or is already in Flight Plan", () => {
    const listing = {
      path: "/work",
      parentPath: "/",
      folders: [
        { name: "checkout-web", path: "/work/checkout-web", isRepository: true },
        { name: "storefront", path: "/work/storefront", isRepository: true },
      ],
    }
    const addedPaths = { inSetup: ["/work/checkout-web"], inFlightPlan: ["/work/storefront"] }

    expect(buildFolderBrowser(listing, addedPaths).folders).toStrictEqual([
      { name: "checkout-web", path: "/work/checkout-web", kind: "added-repository", kindLabel: "Added" },
      { name: "storefront", path: "/work/storefront", kind: "added-repository", kindLabel: "Already in Flight Plan" },
    ])
  })

  it("says so when a folder holds no folders", () => {
    expect(buildFolderBrowser({ path: "/work/notes", parentPath: "/work", folders: [] }, NO_ADDED_PATHS).message).toBe(
      "This folder has no folders inside it.",
    )
  })
})

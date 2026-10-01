import { NO_ADDED_PATHS } from "@/procedures/get-setup/utils/added-paths"
import { buildFolderSuggestions } from "@/procedures/search-repository-folders/utils/build-folder-suggestions"

describe("buildFolderSuggestions", () => {
  it("names each folder by its last segment", () => {
    expect(buildFolderSuggestions(["/work/checkout-web", "C:\\work\\ledger"], NO_ADDED_PATHS, "")).toStrictEqual({
      options: [
        { path: "/work/checkout-web", name: "checkout-web", isAdded: false, stateLabel: null },
        { path: "C:\\work\\ledger", name: "ledger", isAdded: false, stateLabel: null },
      ],
      message: null,
    })
  })

  it("offers at most eight folders", () => {
    const paths = Array.from({ length: 12 }, (_unused, position) => `/work/repository-${String(position)}`)

    expect(buildFolderSuggestions(paths, NO_ADDED_PATHS, "repository").options).toHaveLength(8)
  })

  it("marks a folder that is already added, and says where", () => {
    const addedPaths = { inSetup: ["/work/checkout-web"], inFlightPlan: ["/work/storefront"] }

    expect(buildFolderSuggestions(["/work/checkout-web", "/work/storefront"], addedPaths, "").options).toStrictEqual([
      { path: "/work/checkout-web", name: "checkout-web", isAdded: true, stateLabel: "Added" },
      { path: "/work/storefront", name: "storefront", isAdded: true, stateLabel: "Already in Flight Plan" },
    ])
  })

  it("says that nothing matches the typed text", () => {
    expect(buildFolderSuggestions([], NO_ADDED_PATHS, " notes ").message).toBe("No repository folder matches “notes”.")
    expect(buildFolderSuggestions([], NO_ADDED_PATHS, "").message).toBe("No repository folders were found on this machine.")
  })
})

import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import { findBaseBranch } from "@/procedures/set-base-branch/utils/find-base-branch"

const CHECKOUT_WEB_PATH = "/Users/dev/projects/checkout-web"
const NOTES_PATH = "/Users/dev/projects/meeting-notes"

describe("findBaseBranch", () => {
  it("finds a branch the repository has", async () => {
    await expect(findBaseBranch(createMockSetupEnvironment(), CHECKOUT_WEB_PATH, "develop")).resolves.toStrictEqual({
      kind: "found",
      baseBranch: "develop",
    })
  })

  it("detects the main branch when none is chosen", async () => {
    await expect(findBaseBranch(createMockSetupEnvironment(), CHECKOUT_WEB_PATH, null)).resolves.toStrictEqual({
      kind: "found",
      baseBranch: "main",
    })
  })

  it("finds no base branch when none is chosen and none can be detected", async () => {
    await expect(findBaseBranch(createMockSetupEnvironment(), NOTES_PATH, null)).resolves.toStrictEqual({
      kind: "found",
      baseBranch: null,
    })
  })

  it("rejects a branch the repository does not have", async () => {
    await expect(findBaseBranch(createMockSetupEnvironment(), CHECKOUT_WEB_PATH, "trunk")).resolves.toStrictEqual({
      kind: "rejected",
      message: "trunk is not a branch of this repository.",
    })
  })
})

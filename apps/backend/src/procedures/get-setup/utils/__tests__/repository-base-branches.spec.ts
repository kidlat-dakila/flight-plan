import { CHECKOUT_WEB, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import { findRepositoryBaseBranches, repositoryBaseBranchOf } from "@/procedures/get-setup/utils/repository-base-branches"

const PAYMENTS_PATH = "/Users/dev/projects/payments-service"
const NOTES_PATH = "/Users/dev/projects/meeting-notes"

describe("findRepositoryBaseBranches", () => {
  it("keeps the saved base branch, and detects the main branch of a repository saved without one", async () => {
    const detectMainBranch = vi.fn(createMockSetupEnvironment().detectMainBranch)
    const repositories = [
      ...READY_TO_FINISH.repositories,
      { ...CHECKOUT_WEB, name: "payments-service", path: PAYMENTS_PATH, baseBranch: "develop" },
      { ...CHECKOUT_WEB, name: "meeting-notes", path: NOTES_PATH },
    ]

    await expect(findRepositoryBaseBranches(repositories, { detectMainBranch })).resolves.toStrictEqual({
      [CHECKOUT_WEB.path]: "main",
      [PAYMENTS_PATH]: "develop",
    })
    expect(detectMainBranch.mock.calls.map(([path]) => path)).toStrictEqual([CHECKOUT_WEB.path, NOTES_PATH])
  })
})

describe("repositoryBaseBranchOf", () => {
  it("is the base branch found for the repository, or none", () => {
    expect(repositoryBaseBranchOf({ [CHECKOUT_WEB.path]: "main" }, CHECKOUT_WEB.path)).toBe("main")
    expect(repositoryBaseBranchOf({}, CHECKOUT_WEB.path)).toBeNull()
  })
})

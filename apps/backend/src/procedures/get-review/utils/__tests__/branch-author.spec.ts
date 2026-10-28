import { adapterWith } from "@/__tests__/adapter-stub"
import { createMockProcedureContext } from "@/procedures/context"
import { readBranchAuthorEmail } from "@/procedures/get-review/utils/branch-author"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import type { RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import { GitAdapterError, type GitAdapter } from "@flightplan/git-forge"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const LEDGER: Repository = {
  name: "ledger",
  path: "/work/ledger",
  baseBranch: "develop",
  forge: "git",
  forgeSlug: null,
  problem: null,
  targets: [],
}

const openerOf = (gitAdapter: GitAdapter) =>
  vi.fn<RepositoryAdapterOpener>(async () =>
    await Promise.resolve({ forge: "git", adapterName: "git", forgeSlug: null, resolved: { ok: true, gitAdapter, repo: "" } }))

const contextWith = (openRepository: RepositoryAdapterOpener) => ({ ...createMockProcedureContext(NOW), openRepository })

describe("readBranchAuthorEmail", () => {
  it("reads who began the branch against the repository's base branch", async () => {
    const openRepository = openerOf(adapterWith("git", {
      branchStart: async () => await Promise.resolve({ startedAt: "2026-09-30T08:00:00.000Z", authorEmail: "dev@acme.test" }),
    }))

    await expect(readBranchAuthorEmail(LEDGER, "spike/returns", contextWith(openRepository))).resolves.toBe("dev@acme.test")
    expect(openRepository).toHaveBeenCalledWith("/work/ledger", null, "develop")
  })

  it("reads nobody when the base branch is gone", async () => {
    const openRepository = openerOf(adapterWith("git", {
      branchStart: async () =>
        await Promise.reject(new GitAdapterError("The branch develop to compare with does not exist in this repository.", "no-repo")),
    }))

    await expect(readBranchAuthorEmail(LEDGER, "spike/returns", contextWith(openRepository))).resolves.toBeNull()
  })
})

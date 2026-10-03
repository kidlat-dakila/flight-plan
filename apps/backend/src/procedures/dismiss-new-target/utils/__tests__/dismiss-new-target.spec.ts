import { dismissNewTarget } from "@/procedures/dismiss-new-target/utils/dismiss-new-target"
import type { Repository } from "@/procedures/list-repositories/utils/repository"

const UPDATED_AT = new Date("2026-10-01T12:00:00.000Z")

const repository: Repository = {
  name: "storefront",
  path: "/work/storefront",
  forge: "git",
  forgeSlug: null,
  problem: null,
  hasFollowedAuthors: true,
  targets: [
    { kind: "branch", name: "first", branchStatus: "no-review", isNew: true, updatedAt: UPDATED_AT },
    { kind: "branch", name: "second", branchStatus: "no-review", isNew: true, updatedAt: UPDATED_AT },
  ],
}

describe("dismissNewTarget", () => {
  it("takes the new mark off the named review target only", () => {
    const dismissed = dismissNewTarget([repository], "storefront", "branch-first")

    expect(dismissed?.targets.map((target) => target.isNew)).toStrictEqual([false, true])
  })

  it("leaves the repository it was given unchanged", () => {
    dismissNewTarget([repository], "storefront", "branch-first")

    expect(repository.targets.map((target) => target.isNew)).toStrictEqual([true, true])
  })

  it("finds nothing for a repository it does not know", () => {
    expect(dismissNewTarget([repository], "ledger-api", "branch-first")).toBeNull()
  })

  it("finds nothing for a review target the repository does not have", () => {
    expect(dismissNewTarget([repository], "storefront", "pr-1")).toBeNull()
  })
})

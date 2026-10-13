import { WEBHOOK_RETRY_ARTIFACT } from "@/procedures/get-review/utils/mocks/webhook-retry-artifact"
import { isFinishedFlightPlan, newTargetIdsOf, withoutFinishedPrompts } from "@/procedures/list-repositories/utils/finished-targets"
import type { Repository } from "@/procedures/list-repositories/utils/repository"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const PUBLICATIONS = [{ kind: "claude" as const, url: "https://claude.ai/artifact/abc", publishedAt: NOW }]

const repository: Repository = {
  name: "storefront",
  path: "/work/storefront",
  forge: "git",
  forgeSlug: null,
  problem: null,
  hasFollowedAuthors: true,
  targets: [
    { kind: "branch", name: "feature/new", branchStatus: "no-review", isNew: true, updatedAt: NOW },
    { kind: "branch", name: "feature/published", branchStatus: "no-review", isNew: true, updatedAt: NOW },
    { kind: "branch", name: "feature/old", branchStatus: "no-review", isNew: false, updatedAt: NOW },
  ],
}

describe("newTargetIdsOf", () => {
  it("names the review targets that are prompted as new", () => {
    expect(newTargetIdsOf(repository)).toStrictEqual(["branch-feature/new", "branch-feature/published"])
  })
})

describe("isFinishedFlightPlan", () => {
  it("is finished when the Flight Plan is complete and was uploaded", () => {
    expect(isFinishedFlightPlan({ ...WEBHOOK_RETRY_ARTIFACT, status: "complete" }, PUBLICATIONS)).toBe(true)
  })

  it("is not finished without a Flight Plan, while it is not complete, or before it is uploaded", () => {
    expect(isFinishedFlightPlan(null, PUBLICATIONS)).toBe(false)
    expect(isFinishedFlightPlan({ ...WEBHOOK_RETRY_ARTIFACT, status: "authoring" }, PUBLICATIONS)).toBe(false)
    expect(isFinishedFlightPlan({ ...WEBHOOK_RETRY_ARTIFACT, status: "complete" }, [])).toBe(false)
  })
})

describe("withoutFinishedPrompts", () => {
  it("stops prompting for the review targets whose Flight Plan is finished, and keeps them listed", () => {
    const { targets } = withoutFinishedPrompts(repository, ["branch-feature/published"])

    expect(targets.map((target) => target.isNew)).toStrictEqual([true, false, false])
  })

  it("returns the repository as it is when nothing is finished", () => {
    expect(withoutFinishedPrompts(repository, [])).toBe(repository)
  })
})

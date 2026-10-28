import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { buildStatusFilter, DEFAULT_STATUSES, matchingTargets, selectStatuses } from "@/procedures/list-repositories/utils/status-filter"

const UPDATED_AT = new Date("2026-10-01T12:00:00.000Z")

const repository: Repository = {
  name: "storefront",
  path: "/work/storefront",
  baseBranch: null,
  forge: "git",
  forgeSlug: null,
  problem: null,
  targets: [
    { kind: "branch", name: "first", branchStatus: "stale", isNew: false, updatedAt: UPDATED_AT },
    { kind: "branch", name: "second", branchStatus: "merged", isNew: false, updatedAt: UPDATED_AT },
    { kind: "branch", name: "third", branchStatus: "stale", isNew: false, updatedAt: UPDATED_AT },
  ],
}

describe("selectStatuses", () => {
  it("selects every status except draft, closed and merged when nothing is requested", () => {
    expect(selectStatuses(null)).toStrictEqual(["no-review", "awaiting-review", "awaiting-reply", "stale"])
  })

  it("keeps the known statuses once, in their fixed order", () => {
    expect(selectStatuses(["merged", "unknown", "no-review", "merged"])).toStrictEqual(["no-review", "merged"])
  })

  it("selects nothing when an empty selection is requested", () => {
    expect(selectStatuses([])).toStrictEqual([])
  })
})

describe("matchingTargets", () => {
  it("keeps the review targets that match any selected status", () => {
    expect(matchingTargets(repository, ["stale"])).toHaveLength(2)
    expect(matchingTargets(repository, ["stale", "merged"])).toHaveLength(3)
    expect(matchingTargets(repository, ["draft"])).toHaveLength(0)
  })

  it("keeps nothing when no status is selected", () => {
    expect(matchingTargets(repository, [])).toHaveLength(0)
  })
})

describe("buildStatusFilter", () => {
  it("counts the review targets of every status in the whole list, zero included", () => {
    expect(buildStatusFilter([repository], DEFAULT_STATUSES).options).toMatchObject([
      { status: "no-review", label: "No review", countLabel: "0", isSelected: true },
      { status: "awaiting-review", label: "Awaiting review", countLabel: "0", isSelected: true },
      { status: "awaiting-reply", label: "Awaiting reply", countLabel: "0", isSelected: true },
      { status: "stale", label: "Stale", countLabel: "2", isSelected: true },
      { status: "draft", label: "Draft", countLabel: "0", isSelected: false },
      { status: "closed", label: "Closed", countLabel: "0", isSelected: false },
      { status: "merged", label: "Merged", countLabel: "1", isSelected: false },
    ])
  })

  it("names the selection on its button and knows the default one", () => {
    expect(buildStatusFilter([repository], DEFAULT_STATUSES)).toMatchObject({
      buttonLabel: "Status: 4 of 7",
      isDefault: true,
    })
    expect(buildStatusFilter([repository], ["stale", "merged"])).toMatchObject({
      buttonLabel: "Status: 2 of 7",
      isDefault: false,
    })
  })

  it("says which statuses are selected after an option is toggled", () => {
    const filter = buildStatusFilter([repository], ["stale"])

    expect(filter.options.map((option) => option.toggledStatuses)).toStrictEqual([
      ["no-review", "stale"],
      ["awaiting-review", "stale"],
      ["awaiting-reply", "stale"],
      [],
      ["stale", "draft"],
      ["stale", "closed"],
      ["stale", "merged"],
    ])
  })
})

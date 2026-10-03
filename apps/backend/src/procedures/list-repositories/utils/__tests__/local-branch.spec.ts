import { isTrackedBranch, toLocalBranch } from "@/procedures/list-repositories/utils/local-branch"

const tip = { name: "feature/a", sha: "abc1234", authorEmail: "mira@acme.test", updatedAt: "2026-10-01T10:00:00.000Z" }

describe("isTrackedBranch", () => {
  it("tracks a branch whose tip is by a tracked author", () => {
    expect(isTrackedBranch(tip, ["teo@acme.test", "Mira@acme.test"])).toBe(true)
  })

  it("leaves out a branch by anyone else", () => {
    expect(isTrackedBranch(tip, ["teo@acme.test"])).toBe(false)
  })
})

describe("toLocalBranch", () => {
  it("reads the dates of the tip and of the start", () => {
    expect(toLocalBranch(tip, "2026-09-30T08:00:00.000Z")).toStrictEqual({
      name: "feature/a",
      tipDate: new Date("2026-10-01T10:00:00.000Z"),
      startedAt: new Date("2026-09-30T08:00:00.000Z"),
    })
  })

  it("starts a branch at its tip when the start is unknown", () => {
    expect(toLocalBranch(tip, null).startedAt).toStrictEqual(new Date("2026-10-01T10:00:00.000Z"))
  })
})

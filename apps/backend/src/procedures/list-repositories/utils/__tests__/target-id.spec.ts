import {
  branchNameOfTargetId,
  pullRequestNumberOfTargetId,
  pullRequestTargetIdOf,
} from "@/procedures/list-repositories/utils/target-id"

describe("pullRequestNumberOfTargetId", () => {
  it("reads the number of a pull request's review target", () => {
    expect(pullRequestNumberOfTargetId(pullRequestTargetIdOf(412))).toBe(412)
  })

  it.each(["branch-pr-1", "pr-", "pr-0", "pr-01", "pr-1a", "pr--1"])("reads no number from %j", (targetId) => {
    expect(pullRequestNumberOfTargetId(targetId)).toBeNull()
  })
})

describe("branchNameOfTargetId", () => {
  it("reads the name of a branch's review target", () => {
    expect(branchNameOfTargetId("branch-spike/returns")).toBe("spike/returns")
  })

  it.each(["pr-1", "branch-"])("reads no name from %j", (targetId) => {
    expect(branchNameOfTargetId(targetId)).toBeNull()
  })
})

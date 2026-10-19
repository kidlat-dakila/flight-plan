import {
  authorPatternOf,
  mainBranchOf,
  parseCommitDate,
  parseGitFolders,
} from "@/procedures/list-recent-repositories/utils/repository-activity"

describe("parseGitFolders", () => {
  it("reads the shared git folder of the main worktree", () => {
    expect(parseGitFolders("/Users/dev/projects/shop/.git\n/Users/dev/projects/shop/.git\n")).toStrictEqual({
      gitFolderPath: "/Users/dev/projects/shop/.git",
      isMainWorktree: true,
    })
  })

  it("reads the shared git folder of a linked worktree", () => {
    expect(parseGitFolders("/Users/dev/projects/shop/.git/worktrees/fix\n/Users/dev/projects/shop/.git\n")).toStrictEqual({
      gitFolderPath: "/Users/dev/projects/shop/.git",
      isMainWorktree: false,
    })
  })

  it("reads nothing from output with one folder", () => {
    expect(parseGitFolders("/Users/dev/projects/shop/.git\n")).toBeNull()
  })
})

describe("mainBranchOf", () => {
  it("prefers main over master", () => {
    expect(mainBranchOf("refs/heads/master\nrefs/heads/main\n")).toBe("main")
  })

  it("falls back to master", () => {
    expect(mainBranchOf("refs/heads/master\n")).toBe("master")
  })

  it("finds no main branch when neither exists", () => {
    expect(mainBranchOf("")).toBeNull()
  })
})

describe("parseCommitDate", () => {
  it("reads the date of the commit", () => {
    expect(parseCommitDate("2026-10-19T19:25:32+02:00\n")).toStrictEqual(new Date("2026-10-19T17:25:32.000Z"))
  })

  it("reads no date when git printed none", () => {
    expect(parseCommitDate("")).toBeNull()
  })

  it("reads no date from text that is not one", () => {
    expect(parseCommitDate("not a date")).toBeNull()
  })
})

describe("authorPatternOf", () => {
  it("matches the whole email between angle brackets", () => {
    expect(authorPatternOf("dev+work@acme.example")).toBe("<dev+work@acme.example>")
  })
})

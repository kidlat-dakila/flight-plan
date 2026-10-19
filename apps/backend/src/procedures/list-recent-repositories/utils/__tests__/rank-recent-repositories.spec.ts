import {
  rankRecentRepositories,
  RECENT_REPOSITORY_LIMIT,
  type FolderActivity,
} from "@/procedures/list-recent-repositories/utils/rank-recent-repositories"

const folderActivity = (path: string, latestCommitAt: string, overrides: Partial<FolderActivity["activity"]> = {}): FolderActivity => ({
  path,
  activity: {
    gitFolderPath: `${path}/.git`,
    isMainWorktree: true,
    branch: "main",
    latestCommitAt: new Date(latestCommitAt),
    ...overrides,
  },
})

const pathsOf = (folders: readonly FolderActivity[]): readonly string[] => folders.map((folder) => folder.path)

describe("rankRecentRepositories", () => {
  it("puts the repository with the latest commit first", () => {
    const ranked = rankRecentRepositories([
      folderActivity("/dev/ledger", "2026-10-02T08:00:00Z"),
      folderActivity("/dev/shop", "2026-10-19T08:00:00Z"),
      folderActivity("/dev/docs", "2026-10-10T08:00:00Z"),
    ])

    expect(pathsOf(ranked)).toStrictEqual(["/dev/shop", "/dev/docs", "/dev/ledger"])
  })

  it("compares the moments of commits made in different time zones", () => {
    const ranked = rankRecentRepositories([
      folderActivity("/dev/berlin", "2026-10-19T19:00:00+02:00"),
      folderActivity("/dev/london", "2026-10-19T18:30:00+00:00"),
    ])

    expect(pathsOf(ranked)).toStrictEqual(["/dev/london", "/dev/berlin"])
  })

  it("orders repositories with the same commit date by path", () => {
    const ranked = rankRecentRepositories([
      folderActivity("/dev/b", "2026-10-19T08:00:00Z"),
      folderActivity("/dev/a", "2026-10-19T08:00:00Z"),
    ])

    expect(pathsOf(ranked)).toStrictEqual(["/dev/a", "/dev/b"])
  })

  it(`keeps the ${String(RECENT_REPOSITORY_LIMIT)} latest`, () => {
    const folders = Array.from({ length: RECENT_REPOSITORY_LIMIT + 2 }, (_, day) =>
      folderActivity(`/dev/repository-${String(day + 1)}`, `2026-10-${String(day + 1).padStart(2, "0")}T08:00:00Z`))

    const ranked = rankRecentRepositories(folders)

    expect(ranked).toHaveLength(RECENT_REPOSITORY_LIMIT)
    expect(ranked.at(0)?.path).toBe("/dev/repository-12")
    expect(ranked.at(-1)?.path).toBe("/dev/repository-3")
  })

  it("counts the worktrees of one repository once, under the main worktree", () => {
    const sharedGitFolder = { gitFolderPath: "/dev/shop/.git" }
    const ranked = rankRecentRepositories([
      folderActivity("/dev/worktrees/shop-fix", "2026-10-19T08:00:00Z", { ...sharedGitFolder, isMainWorktree: false }),
      folderActivity("/dev/shop", "2026-10-19T08:00:00Z", sharedGitFolder),
      folderActivity("/dev/docs", "2026-10-10T08:00:00Z"),
    ])

    expect(pathsOf(ranked)).toStrictEqual(["/dev/shop", "/dev/docs"])
  })

  it("keeps one linked worktree when the main worktree was not found", () => {
    const sharedGitFolder = { gitFolderPath: "/srv/shop.git", isMainWorktree: false }
    const ranked = rankRecentRepositories([
      folderActivity("/dev/shop-two", "2026-10-19T08:00:00Z", sharedGitFolder),
      folderActivity("/dev/shop-one", "2026-10-19T08:00:00Z", sharedGitFolder),
    ])

    expect(pathsOf(ranked)).toStrictEqual(["/dev/shop-one"])
  })

  it("ranks nothing when there are no repositories", () => {
    expect(rankRecentRepositories([])).toStrictEqual([])
  })
})

import { NO_ADDED_PATHS } from "@/procedures/get-setup/utils/added-paths"
import {
  buildRecentRepositories,
  NO_RECENT_REPOSITORY_MESSAGE,
} from "@/procedures/list-recent-repositories/utils/build-recent-repositories"
import type { FolderActivity } from "@/procedures/list-recent-repositories/utils/rank-recent-repositories"

const SHOP: FolderActivity = {
  path: "/Users/dev/projects/shop",
  activity: {
    gitFolderPath: "/Users/dev/projects/shop/.git",
    isMainWorktree: true,
    branch: "master",
    latestCommitAt: new Date("2026-10-17T12:00:00.000Z"),
  },
}

describe("buildRecentRepositories", () => {
  it("lists each repository with its main branch and the time of the user's latest commit on it", () => {
    expect(buildRecentRepositories([SHOP], NO_ADDED_PATHS)).toStrictEqual({
      repositories: [
        {
          path: "/Users/dev/projects/shop",
          name: "shop",
          branch: "master",
          latestCommitAt: "2026-10-17T12:00:00.000Z",
          isAdded: false,
          stateLabel: null,
        },
      ],
      message: null,
    })
  })

  it("marks a repository the setup already holds", () => {
    const addedPaths = { inSetup: [SHOP.path], inFlightPlan: [] }

    expect(buildRecentRepositories([SHOP], addedPaths)).toMatchObject({
      repositories: [{ isAdded: true, stateLabel: "Added" }],
    })
  })

  it("marks a repository Flight Plan already follows", () => {
    const addedPaths = { inSetup: [], inFlightPlan: [SHOP.path] }

    expect(buildRecentRepositories([SHOP], addedPaths)).toMatchObject({
      repositories: [{ isAdded: true, stateLabel: "Already in Flight Plan" }],
    })
  })

  it("says so when no repository was found", () => {
    expect(buildRecentRepositories([], NO_ADDED_PATHS)).toStrictEqual({
      repositories: [],
      message: NO_RECENT_REPOSITORY_MESSAGE,
    })
  })
})

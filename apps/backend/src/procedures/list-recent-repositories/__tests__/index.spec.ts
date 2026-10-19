import type { ProcedureContext } from "@/procedures/context"
import { createSetupContext, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import type { GitIdentity } from "@/procedures/get-setup/utils/git-identity"
import { EMPTY_SETUP, type Setup } from "@/procedures/get-setup/utils/setup"
import { listRecentRepositories } from "@/procedures/list-recent-repositories"
import { NO_RECENT_REPOSITORY_MESSAGE } from "@/procedures/list-recent-repositories/utils/build-recent-repositories"

const DEV_IDENTITY: GitIdentity = { name: "Dev Harper", email: "dev@acme.example" }

const withGitIdentity = (
  context: ProcedureContext,
  identityOf: (path: string) => GitIdentity | null,
): ProcedureContext => ({
  ...context,
  setupEnvironment: {
    ...context.setupEnvironment,
    readGitIdentity: async (path) => await Promise.resolve(identityOf(path)),
  },
})

const contextWithIdentity = (setup: Setup): ProcedureContext =>
  withGitIdentity(createSetupContext(setup), () => DEV_IDENTITY)

describe("listRecentRepositories", () => {
  it("lists the repositories with the user's latest commit on main or master first", async () => {
    await expect(listRecentRepositories({}, contextWithIdentity(EMPTY_SETUP))).resolves.toStrictEqual({
      repositories: [
        {
          path: "/Users/dev/projects/payments-service",
          name: "payments-service",
          branch: "master",
          latestCommitAt: "2026-10-01T10:00:00.000Z",
          latestCommitLabel: "2 hours ago",
          isAdded: false,
          stateLabel: null,
        },
        {
          path: "/Users/dev/projects/checkout-web",
          name: "checkout-web",
          branch: "main",
          latestCommitAt: "2026-09-30T09:30:00.000Z",
          latestCommitLabel: "1 day ago",
          isAdded: false,
          stateLabel: null,
        },
        {
          path: "/Users/dev/work/mobile-app",
          name: "mobile-app",
          branch: "main",
          latestCommitAt: "2026-09-24T16:45:00.000Z",
          latestCommitLabel: "6 days ago",
          isAdded: false,
          stateLabel: null,
        },
      ],
      message: null,
    })
  })

  it("marks a repository the setup already holds", async () => {
    await expect(listRecentRepositories({}, contextWithIdentity(READY_TO_FINISH))).resolves.toMatchObject({
      repositories: [{ name: "payments-service" }, { name: "checkout-web", isAdded: true, stateLabel: "Added" }, {}],
    })
  })

  it("asks git for the commits of the email git config holds in each repository", async () => {
    const context = contextWithIdentity(EMPTY_SETUP)
    const readRepositoryActivity = vi.fn(context.setupEnvironment.readRepositoryActivity)
    const recordingContext: ProcedureContext = {
      ...context,
      setupEnvironment: { ...context.setupEnvironment, readRepositoryActivity },
    }

    await listRecentRepositories({}, recordingContext)

    const askedAuthors = readRepositoryActivity.mock.calls.map(([, authorEmail]) => authorEmail)
    expect(new Set(askedAuthors)).toStrictEqual(new Set([DEV_IDENTITY.email]))
  })

  it("leaves out a repository whose git config has no email", async () => {
    const context = withGitIdentity(createSetupContext(EMPTY_SETUP), (path) =>
      path.endsWith("payments-service") ? null : DEV_IDENTITY)

    const recentRepositories = await listRecentRepositories({}, context)

    expect(recentRepositories.repositories.map((repository) => repository.name)).toStrictEqual([
      "checkout-web",
      "mobile-app",
    ])
  })

  it("says so when no repository has a commit by the user", async () => {
    await expect(listRecentRepositories({}, createSetupContext(EMPTY_SETUP))).resolves.toStrictEqual({
      repositories: [],
      message: NO_RECENT_REPOSITORY_MESSAGE,
    })
  })
})

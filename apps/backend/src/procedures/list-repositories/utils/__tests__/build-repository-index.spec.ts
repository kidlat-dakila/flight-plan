import { buildRepositoryIndex } from "@/procedures/list-repositories/utils/build-repository-index"
import type { Repository } from "@/procedures/list-repositories/utils/repository"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const DEFAULT_REQUEST = { statuses: null, authors: null }

const storefront: Repository = {
  name: "storefront",
  path: "/work/storefront",
  forge: "gh",
  forgeSlug: "acme/storefront",
  problem: null,
  hasFollowedAuthors: true,
  targets: [
    {
      kind: "pull-request",
      number: 398,
      title: "Show delivery estimates",
      branch: "feature/delivery-estimate",
      author: "teo",
      authorAvatarUrl: null,
      branchStatus: "no-review",
      isNew: false,
      updatedAt: new Date("2026-09-29T12:00:00.000Z"),
    },
    {
      kind: "pull-request",
      number: 412,
      title: "Count held units in the stock check",
      branch: "feature/held-stock",
      author: "mira",
      authorAvatarUrl: "https://forge.test/mira.png",
      branchStatus: "stale",
      isNew: false,
      updatedAt: new Date("2026-10-01T11:22:00.000Z"),
    },
    {
      kind: "pull-request",
      number: 401,
      title: "Add the currency to the price type",
      branch: "feature/price-currency",
      author: "amara",
      authorAvatarUrl: null,
      branchStatus: "merged",
      isNew: false,
      updatedAt: new Date("2026-09-30T12:00:00.000Z"),
    },
  ],
}

const localRepository: Repository = {
  name: "flight plan",
  path: "/work/flight plan",
  forge: "git",
  forgeSlug: null,
  problem: null,
  hasFollowedAuthors: true,
  targets: [
    {
      kind: "branch",
      name: "feature/web",
      branchStatus: "awaiting-review",
      isNew: false,
      updatedAt: new Date("2026-10-01T10:00:00.000Z"),
    },
  ],
}

const unreachableRepository: Repository = {
  name: "ledger-api",
  path: "/work/ledger-api",
  forge: "gitlab",
  forgeSlug: "acme/ledger-api",
  problem: "auth",
  hasFollowedAuthors: true,
  targets: [],
}

const quietRepository: Repository = { ...unreachableRepository, name: "docs-site", forge: "github", problem: null }

describe("buildRepositoryIndex", () => {
  it("reports an empty index when no repository is known", () => {
    expect(buildRepositoryIndex([], NOW, null, DEFAULT_REQUEST)).toStrictEqual({ kind: "empty", notice: null })
  })

  it("hides draft, closed and merged review targets by default and says how many it shows", () => {
    const index = buildRepositoryIndex([storefront, localRepository], NOW, null, DEFAULT_REQUEST)

    expect(index).toMatchObject({
      kind: "repositories",
      summaryLabel: "2 repositories • 3 of 4 review targets",
      statusFilter: { isDefault: true, buttonLabel: "Status: 4 of 7" },
      repositories: [{ countLabel: "2 of 3 review targets" }, { countLabel: "1 review target" }],
    })
  })

  it("turns a pull request into a display-ready stop, latest update first", () => {
    const index = buildRepositoryIndex([storefront], NOW, null, DEFAULT_REQUEST)

    expect(index).toMatchObject({
      repositories: [
        {
          name: "storefront",
          lineColor: "blue",
          lineLabel: "S",
          source: [{ text: "GitHub", kind: "plain" }, { text: "acme/storefront", kind: "code" }],
          createReviewHref: "/pr-reviews/storefront/create",
          configurationHref: "/pr-reviews/storefront/configurations",
          configurationLabel: "Configure storefront",
          content: {
            kind: "targets",
            targets: [
              {
                id: "pr-412",
                title: { text: "Count held units in the stock check", kind: "plain" },
                details: [
                  { text: "#412", kind: "plain" },
                  { text: "feature/held-stock", kind: "code" },
                ],
                author: { name: "mira", avatarUrl: "https://forge.test/mira.png", monogram: "M" },
                href: "/pr-reviews/storefront/pr-412",
                branchStatus: "stale",
                statusLabel: "Stale",
                updatedLabel: "38 minutes ago",
              },
              {
                id: "pr-398",
                author: { name: "teo", avatarUrl: null, monogram: "T" },
                statusLabel: "No review",
                updatedLabel: "2 days ago",
              },
            ],
          },
        },
      ],
    })
  })

  it("lists a branch of a repository on plain git and encodes its link", () => {
    const index = buildRepositoryIndex([localRepository], NOW, null, DEFAULT_REQUEST)

    expect(index).toMatchObject({
      repositories: [
        {
          source: [{ text: "Local git", kind: "plain" }, { text: "/work/flight plan", kind: "code" }],
          content: {
            kind: "targets",
            targets: [
              {
                id: "branch-feature/web",
                title: { text: "feature/web", kind: "code" },
                details: [{ text: "Local branch", kind: "plain" }],
                author: null,
                href: "/pr-reviews/flight%20plan/branch-feature%2Fweb",
                statusLabel: "Awaiting review",
              },
            ],
          },
        },
      ],
    })
  })

  it("shows the forge problem in place of the review targets", () => {
    const index = buildRepositoryIndex([unreachableRepository], NOW, null, DEFAULT_REQUEST)

    expect(index).toMatchObject({
      repositories: [
        {
          countLabel: "Unavailable",
          content: {
            kind: "problem",
            message: "Not signed in, or the token cannot see this repository.",
            actionLabel: "Open forge configuration",
            actionHref: "/configurations/forge",
          },
        },
      ],
    })
  })

  it("says so when a repository has nothing to review", () => {
    const index = buildRepositoryIndex([quietRepository], NOW, null, DEFAULT_REQUEST)

    expect(index).toMatchObject({
      repositories: [{ countLabel: "0 review targets", content: { kind: "empty", message: "No open pull requests." } }],
    })
  })

  it("says that no branch is listed when a local repository follows nobody", () => {
    const followsNobody = { ...localRepository, hasFollowedAuthors: false, targets: [] }

    expect(buildRepositoryIndex([followsNobody], NOW, null, DEFAULT_REQUEST)).toMatchObject({
      repositories: [
        {
          content: {
            kind: "empty",
            message: "Nobody is tracked here, so no branches are listed. Track an author in this repository's configuration.",
          },
        },
      ],
    })
  })

  it("says that no branch is left to review when a local repository follows someone", () => {
    const followsSomeone = { ...localRepository, targets: [] }

    expect(buildRepositoryIndex([followsSomeone], NOW, null, DEFAULT_REQUEST)).toMatchObject({
      repositories: [{ content: { kind: "empty", message: "No branches to review." } }],
    })
  })

  it("prompts for a review of each new review target, whatever the filters hide", () => {
    const newBranch = { ...localRepository.targets[0], isNew: true, branchStatus: "merged" as const }
    const index = buildRepositoryIndex([{ ...localRepository, targets: [newBranch] }], NOW, null, DEFAULT_REQUEST)

    expect(index).toMatchObject({
      repositories: [
        {
          content: { kind: "empty" },
          newTargets: [
            {
              id: "branch-feature/web",
              kindLabel: "New branch",
              title: { text: "feature/web", kind: "code" },
              details: [{ text: "Local branch", kind: "plain" }],
              author: null,
              updatedLabel: "2 hours ago",
              createReviewHref: "/pr-reviews/flight%20plan/branch-feature%2Fweb",
            },
          ],
        },
      ],
    })
  })

  it("prompts for nothing when no review target is new", () => {
    expect(buildRepositoryIndex([storefront], NOW, null, DEFAULT_REQUEST)).toMatchObject({
      repositories: [{ newTargets: [] }],
    })
  })

  it("carries the notice about the data", () => {
    expect(buildRepositoryIndex([quietRepository], NOW, "Sample data.", DEFAULT_REQUEST)).toMatchObject({
      notice: "Sample data.",
    })
  })

  it("shows only the review targets of the requested statuses", () => {
    const index = buildRepositoryIndex([storefront, localRepository], NOW, null, { statuses: ["merged"], authors: null })

    expect(index).toMatchObject({
      summaryLabel: "2 repositories • 1 of 4 review targets",
      statusFilter: { isDefault: false },
      repositories: [
        { countLabel: "1 of 3 review targets", content: { kind: "targets", targets: [{ id: "pr-401" }] } },
        {
          name: "flight plan",
          lineColor: "green",
          countLabel: "0 of 1 review target",
          content: { kind: "empty", message: "1 review target is hidden by the filters." },
        },
      ],
    })
  })

  it("keeps every repository listed when no status is selected", () => {
    const index = buildRepositoryIndex([storefront], NOW, null, { statuses: [], authors: null })

    expect(index).toMatchObject({
      summaryLabel: "1 repository • 0 of 3 review targets",
      repositories: [
        { content: { kind: "empty", message: "3 review targets are hidden by the filters." } },
      ],
    })
  })

  it("shows only the review targets of the requested authors that also have a selected status", () => {
    const index = buildRepositoryIndex([storefront, localRepository], NOW, null, {
      statuses: null,
      authors: ["mira", "amara"],
    })

    expect(index).toMatchObject({
      summaryLabel: "2 repositories • 1 of 4 review targets",
      authorFilter: { buttonLabel: "Author: 1 of 3", isDefault: false },
      repositories: [
        { content: { kind: "targets", targets: [{ id: "pr-412" }] } },
        { content: { kind: "empty", message: "1 review target is hidden by the filters." } },
      ],
    })
  })

  it("offers only the authors of the review targets that have a selected status, with counts for those", () => {
    const index = buildRepositoryIndex([storefront, localRepository], NOW, null, { statuses: ["merged"], authors: null })

    expect(index).toMatchObject({
      authorFilter: {
        buttonLabel: "Author: all",
        options: [{ key: "amara", countLabel: "1", isSelected: true }],
      },
    })
  })

  it("ignores a status it does not know", () => {
    const index = buildRepositoryIndex([storefront], NOW, null, { statuses: ["archived", "stale"], authors: null })

    expect(index).toMatchObject({ summaryLabel: "1 repository • 1 of 3 review targets" })
  })

  it("gives each repository the next line colour and starts over after the last", () => {
    const repositories = Array.from({ length: 7 }, (_unused, position) => ({
      ...quietRepository,
      name: `repository-${String(position)}`,
    }))

    const index = buildRepositoryIndex(repositories, NOW, null, DEFAULT_REQUEST)

    expect(index).toMatchObject({
      repositories: [
        { lineColor: "blue" },
        { lineColor: "green" },
        { lineColor: "magenta" },
        { lineColor: "violet" },
        { lineColor: "teal" },
        { lineColor: "lime" },
        { lineColor: "blue" },
      ],
    })
  })
})

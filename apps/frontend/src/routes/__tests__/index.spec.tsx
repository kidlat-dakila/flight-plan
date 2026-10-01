import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { fakeBackendLinks, type ProcedureHandlers, type ProcedureReply } from "./fake-backend"
import { createApp } from "@/app"
import { createTrpcClient } from "@/trpc"

const storefrontLine = {
  name: "storefront",
  lineColor: "blue",
  lineLabel: "S",
  source: [{ text: "GitHub", kind: "plain" }, { text: "acme/storefront", kind: "code" }],
  countLabel: "1 review target",
  createReviewHref: "/pr-reviews/storefront/create",
  configurationHref: "/pr-reviews/storefront/configurations",
  configurationLabel: "Configure storefront",
  newTargets: [],
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
        author: { name: "mira", avatarUrl: null, monogram: "M" },
        href: "/pr-reviews/storefront/pr-412",
        branchStatus: "stale",
        statusLabel: "Stale",
        updatedLabel: "38 minutes ago",
      },
    ],
  },
}

const ledgerLine = {
  name: "ledger-api",
  lineColor: "green",
  lineLabel: "L",
  source: [{ text: "GitLab", kind: "plain" }, { text: "acme/ledger-api", kind: "code" }],
  countLabel: "Unavailable",
  createReviewHref: "/pr-reviews/ledger-api/create",
  configurationHref: "/pr-reviews/ledger-api/configurations",
  configurationLabel: "Configure ledger-api",
  newTargets: [],
  content: {
    kind: "problem",
    message: "Not signed in, or the token cannot see this repository.",
    actionLabel: "Open forge configuration",
    actionHref: "/configurations/forge",
  },
}

const docsLine = {
  name: "docs-site",
  lineColor: "magenta",
  lineLabel: "D",
  source: [{ text: "Local git", kind: "plain" }, { text: "/work/docs-site", kind: "code" }],
  countLabel: "0 review targets",
  createReviewHref: "/pr-reviews/docs-site/create",
  configurationHref: "/pr-reviews/docs-site/configurations",
  configurationLabel: "Configure docs-site",
  newTargets: [],
  content: { kind: "empty", message: "No branches to review." },
}

const statusFilter = {
  buttonLabel: "Status: 4 of 7",
  isDefault: true,
  options: [
    { status: "stale", label: "Stale", countLabel: "1", isSelected: true, toggledStatuses: ["no-review"] },
    { status: "merged", label: "Merged", countLabel: "2", isSelected: false, toggledStatuses: ["stale", "merged"] },
  ],
}

const withMergedFilter = {
  buttonLabel: "Status: 5 of 7",
  isDefault: false,
  options: [
    { status: "stale", label: "Stale", countLabel: "1", isSelected: true, toggledStatuses: ["merged"] },
    { status: "merged", label: "Merged", countLabel: "2", isSelected: true, toggledStatuses: ["stale"] },
  ],
}

const authorFilter = {
  buttonLabel: "Author: all",
  isDefault: true,
  options: [
    {
      key: "mira",
      label: "mira",
      person: { avatarUrl: null, monogram: "M" },
      countLabel: "1",
      isSelected: true,
      toggledAuthors: ["teo"],
    },
    {
      key: "teo",
      label: "teo",
      person: { avatarUrl: null, monogram: "T" },
      countLabel: "2",
      isSelected: true,
      toggledAuthors: ["mira"],
    },
  ],
}

const miraOnlyFilter = {
  buttonLabel: "Author: 1 of 2",
  isDefault: false,
  options: [
    { ...authorFilter.options[0], toggledAuthors: [] },
    { ...authorFilter.options[1], isSelected: false, toggledAuthors: null },
  ],
}

const indexOf = (repositories: readonly unknown[], summaryLabel: string): ProcedureReply => ({
  data: { kind: "repositories", notice: "Sample data.", summaryLabel, statusFilter, authorFilter, repositories },
})

const renderApp = (handlers: ProcedureHandlers) =>
  render(
    createApp({
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      trpcClient: createTrpcClient(fakeBackendLinks(handlers)),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    }),
  )

describe("the index page", () => {
  it("lists each repository with its review targets and their status", async () => {
    renderApp({ "repository.list": () => indexOf([storefrontLine], "1 repository • 1 review target") })

    const line = await screen.findByRole("region", { name: "storefront" })
    const stop = within(line).getByRole("link", { name: /Count held units in the stock check/ })

    expect(screen.getByText("1 repository • 1 review target")).toBeTruthy()
    expect(within(line).getByText("acme/storefront")).toBeTruthy()
    expect(within(stop).getByText("feature/held-stock")).toBeTruthy()
    expect(within(stop).getByText("mira")).toBeTruthy()
    expect(within(stop).getByText("M")).toBeTruthy()
    expect(stop.getAttribute("href")).toBe("/pr-reviews/storefront/pr-412")
    expect(within(stop).getByText("Stale")).toBeTruthy()
    expect(within(stop).getByText("38 minutes ago")).toBeTruthy()
    expect(within(line).getByRole("link", { name: "Configure storefront" }).getAttribute("href")).toBe(
      "/pr-reviews/storefront/configurations",
    )
    expect(within(line).getByRole("link", { name: "Create Flight Plan" }).getAttribute("href")).toBe(
      "/pr-reviews/storefront/create",
    )
  })

  it("marks the data as sample data", async () => {
    renderApp({ "repository.list": () => indexOf([storefrontLine], "1 repository • 1 review target") })

    expect(await screen.findByText("Sample data.")).toBeTruthy()
  })

  it("offers every status in a menu and asks the backend for the ones that are ticked", async () => {
    const listRepositories = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValueOnce(indexOf([storefrontLine], "1 repository • 1 of 3 review targets"))
      .mockReturnValue({
        data: {
          kind: "repositories",
          notice: null,
          summaryLabel: "1 repository • 3 review targets",
          statusFilter: withMergedFilter,
          authorFilter,
          repositories: [storefrontLine],
        },
      })
    renderApp({ "repository.list": listRepositories })

    fireEvent.click(await screen.findByRole("button", { name: "Status: 4 of 7" }))
    const merged = await screen.findByRole("menuitemcheckbox", { name: "Merged 2" })

    expect(screen.getByRole("menuitemcheckbox", { name: "Stale 1" }).getAttribute("aria-checked")).toBe("true")
    expect(merged.getAttribute("aria-checked")).toBe("false")
    expect(listRepositories).toHaveBeenLastCalledWith({ statuses: null, authors: null })

    fireEvent.click(merged)

    expect(await screen.findByRole("button", { name: "Status: 5 of 7" })).toBeTruthy()
    expect(listRepositories).toHaveBeenLastCalledWith({ statuses: ["stale", "merged"], authors: null })
    expect(await screen.findByRole("menuitem", { name: "Reset to the default statuses" })).toBeTruthy()
  })

  it("offers every author in a menu and asks the backend for the ones that are ticked", async () => {
    const listRepositories = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValueOnce(indexOf([storefrontLine], "1 repository • 1 review target"))
      .mockReturnValue({
        data: {
          kind: "repositories",
          notice: null,
          summaryLabel: "1 repository • 1 of 3 review targets",
          statusFilter,
          authorFilter: miraOnlyFilter,
          repositories: [storefrontLine],
        },
      })
    renderApp({ "repository.list": listRepositories })

    fireEvent.click(await screen.findByRole("button", { name: "Author: all" }))
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: /teo 2/ }))

    expect(await screen.findByRole("button", { name: "Author: 1 of 2" })).toBeTruthy()
    expect(listRepositories).toHaveBeenLastCalledWith({ statuses: null, authors: ["mira"] })

    fireEvent.click(await screen.findByRole("menuitem", { name: "Show all authors" }))

    expect(await screen.findByRole("button", { name: "Author: all" })).toBeTruthy()
  })

  it("asks whether to create a review for a new pull request and can be dismissed", async () => {
    const newTarget = {
      id: "pr-416",
      kindLabel: "New pull request",
      title: { text: "Show the gift card balance at checkout", kind: "plain" },
      details: [
        { text: "#416", kind: "plain" },
        { text: "feature/gift-card-balance", kind: "code" },
      ],
      author: { name: "lena", avatarUrl: null, monogram: "L" },
      updatedLabel: "3 minutes ago",
      createReviewHref: "/pr-reviews/storefront/create?target=pr-416",
    }
    const listRepositories = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValueOnce(indexOf([{ ...storefrontLine, newTargets: [newTarget] }], "1 repository • 1 review target"))
      .mockReturnValue(indexOf([storefrontLine], "1 repository • 1 review target"))
    const dismissNewTarget = vi.fn<() => ProcedureReply>().mockReturnValue({ data: { targetId: "pr-416" } })
    renderApp({ "repository.list": listRepositories, "repository.dismissNewTarget": dismissNewTarget })

    const line = await screen.findByRole("region", { name: "storefront" })

    expect(within(line).getByText("New pull request")).toBeTruthy()
    expect(within(line).getByText("Show the gift card balance at checkout")).toBeTruthy()
    expect(within(line).getByText("lena")).toBeTruthy()
    expect(
      within(line)
        .getAllByRole("link", { name: "Create Flight Plan" })
        .map((link) => link.getAttribute("href")),
    ).toContain("/pr-reviews/storefront/create?target=pr-416")

    fireEvent.click(within(line).getByRole("button", { name: "Dismiss" }))

    await waitFor(() => {
      expect(screen.queryByText("New pull request")).toBeNull()
    })
    expect(dismissNewTarget).toHaveBeenCalledTimes(1)
  })

  it("shows a forge problem in place of the review targets, with the way to fix it", async () => {
    renderApp({ "repository.list": () => indexOf([ledgerLine], "1 repository • 0 review targets") })

    const line = await screen.findByRole("region", { name: "ledger-api" })

    expect(within(line).getByText(/Not signed in, or the token cannot see this repository\./)).toBeTruthy()
    expect(within(line).getByRole("link", { name: "Open forge configuration" }).getAttribute("href")).toBe(
      "/configurations/forge",
    )
  })

  it("says so when a repository has nothing to review", async () => {
    renderApp({ "repository.list": () => indexOf([docsLine], "1 repository • 0 review targets") })

    const line = await screen.findByRole("region", { name: "docs-site" })

    expect(within(line).getByText("No branches to review.")).toBeTruthy()
  })

  it("explains how repositories get on the list when there are none", async () => {
    renderApp({ "repository.list": () => ({ data: { kind: "empty", notice: null } }) })

    expect(await screen.findByRole("heading", { name: "No repositories yet" })).toBeTruthy()
  })

  it("reports that the repositories could not be loaded and offers to try again", async () => {
    renderApp({ "repository.list": () => ({ errorMessage: "The data directory cannot be read." }) })

    const alert = await screen.findByRole("alert")

    expect(within(alert).getByRole("heading", { name: "Could not load your repositories" })).toBeTruthy()
    expect(within(alert).getByText("The data directory cannot be read.")).toBeTruthy()
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeTruthy()
  })

  it("adds a repository by its folder path and lists it", async () => {
    const listRepositories = vi
      .fn<() => ProcedureReply>()
      .mockReturnValueOnce(indexOf([storefrontLine], "1 repository • 1 review target"))
      .mockReturnValue(indexOf([storefrontLine, docsLine], "2 repositories • 1 review target"))
    const addRepository = vi.fn<() => ProcedureReply>().mockReturnValue({ data: { name: "docs-site" } })
    renderApp({ "repository.list": listRepositories, "repository.add": addRepository })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))
    fireEvent.change(screen.getByLabelText("Repository folder"), { target: { value: "/work/docs-site" } })
    fireEvent.click(screen.getByRole("button", { name: "Add" }))

    expect(await screen.findByRole("region", { name: "docs-site" })).toBeTruthy()
    expect(addRepository).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText("Repository folder")).toBeNull()
  })

  it("keeps the form open and shows why a path was not added", async () => {
    renderApp({
      "repository.list": () => indexOf([storefrontLine], "1 repository • 1 review target"),
      "repository.add": () => ({ errorMessage: "/work/storefront is already on the list." }),
    })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))
    fireEvent.change(screen.getByLabelText("Repository folder"), { target: { value: "/work/storefront" } })
    fireEvent.click(screen.getByRole("button", { name: "Add" }))

    const alert = await screen.findByRole("alert")

    expect(alert.textContent).toBe("/work/storefront is already on the list.")
    expect(screen.getByLabelText("Repository folder")).toBeTruthy()
  })

  it("closes the form without adding when it is cancelled", async () => {
    const addRepository = vi.fn<() => ProcedureReply>()
    renderApp({
      "repository.list": () => indexOf([storefrontLine], "1 repository • 1 review target"),
      "repository.add": addRepository,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByLabelText("Repository folder")).toBeNull()
    expect(addRepository).not.toHaveBeenCalled()
  })
})

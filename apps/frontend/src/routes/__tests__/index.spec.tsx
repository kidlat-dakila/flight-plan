import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createApp } from "@/app"
import { createTrpcClient } from "@/trpc"
import { fakeBackendLinks, type ProcedureHandlers, type ProcedureReply } from "./fake-backend"

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

const noFolders = { data: { options: [], message: null } }

const localGitAuthorForm = {
  data: {
    selfAuthorHint: "Git cannot tell who you are here.",
    searchHint: "Search by name or email.",
    searchPlaceholder: "Type a name or email",
  },
}

const forgeAuthorForm = {
  data: { selfAuthorHint: null, searchHint: "Search by name or username.", searchPlaceholder: "Type a name or username" },
}

const devOption = {
  id: "dev@acme.example",
  name: "Dev Harper",
  detail: "dev@acme.example",
  avatarUrl: null,
  monogram: "DH",
  isTaken: false,
  stateLabel: null,
}

const lenaOption = { ...devOption, id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", monogram: "LO" }

const storefrontConfiguration = {
  data: {
    name: "storefront",
    path: "/work/storefront",
    form: {
      selfAuthorHint: "Git cannot tell who you are here.",
      searchHint: "Search by name or email.",
      searchPlaceholder: "Type a name or email",
    },
    selfAuthor: { id: "dev@acme.example", name: "Dev Harper", detail: "dev@acme.example", avatarUrl: null, monogram: "DH" },
    trackedAuthors: [
      { id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", avatarUrl: null, monogram: "LO" },
    ],
  },
}

const someAuthors = { data: { options: [devOption, lenaOption], message: null } }

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
  data: { kind: "repositories", notice: "Sample data.", summaryLabel, statusFilter, authorFilter, repositories, fixtures: null },
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
    expect(within(line).getByRole("button", { name: "Configure storefront" })).toBeTruthy()
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
          fixtures: null,
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
          fixtures: null,
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
    renderApp({ "repository.list": () => ({ data: { kind: "empty", notice: null, fixtures: null } }) })

    expect(await screen.findByRole("heading", { name: "No repositories yet" })).toBeTruthy()
  })

  it("reports that the repositories could not be loaded and offers to try again", async () => {
    renderApp({ "repository.list": () => ({ errorMessage: "The data directory cannot be read." }) })

    const alert = await screen.findByRole("alert")

    expect(within(alert).getByRole("heading", { name: "Could not load your repositories" })).toBeTruthy()
    expect(within(alert).getByText("The data directory cannot be read.")).toBeTruthy()
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeTruthy()
  })

  it("adds a repository with its folder, the user and the users to track, and lists it", async () => {
    const listRepositories = vi
      .fn<() => ProcedureReply>()
      .mockReturnValueOnce(indexOf([storefrontLine], "1 repository • 1 review target"))
      .mockReturnValue(indexOf([storefrontLine, docsLine], "2 repositories • 1 review target"))
    const addRepository = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { name: "docs-site" } })
    renderApp({
      "repository.list": listRepositories,
      "repository.add": addRepository,
      "repository.authorForm": () => localGitAuthorForm,
      "repository.searchAuthors": () => someAuthors,
      "setup.searchFolders": () => noFolders,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))
    fireEvent.change(screen.getByRole("combobox", { name: "Repository folder" }), { target: { value: "/work/docs-site" } })
    const self = await screen.findByRole("combobox", { name: "Which user are you?" })
    fireEvent.focus(self)
    fireEvent.click(await screen.findByRole("option", { name: /Dev Harper/ }))
    const tracked = screen.getByRole("combobox", { name: "Track a user" })
    fireEvent.focus(tracked)
    fireEvent.click(await screen.findByRole("option", { name: /Lena Okafor/ }))
    expect(within(screen.getByRole("list", { name: "Tracked users" })).getByText("Lena Okafor")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Add" }))

    expect(await screen.findByRole("region", { name: "docs-site" })).toBeTruthy()
    expect(addRepository).toHaveBeenCalledWith({
      path: "/work/docs-site",
      selfAuthorId: "dev@acme.example",
      trackedAuthorIds: ["lena@acme.example"],
    })
    expect(screen.queryByRole("combobox", { name: "Repository folder" })).toBeNull()
  })

  it("searches the authors of the folder typed, along with the ones already chosen", async () => {
    const searchAuthors = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue(someAuthors)
    renderApp({
      "repository.list": () => indexOf([storefrontLine], "1 repository • 1 review target"),
      "repository.authorForm": () => localGitAuthorForm,
      "repository.searchAuthors": searchAuthors,
      "setup.searchFolders": () => noFolders,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))
    fireEvent.change(screen.getByRole("combobox", { name: "Repository folder" }), { target: { value: "/work/docs-site" } })
    fireEvent.focus(await screen.findByRole("combobox", { name: "Track a user" }))

    await waitFor(() => {
      expect(searchAuthors).toHaveBeenCalledWith({
        path: "/work/docs-site",
        repositoryName: null,
        role: "tracked",
        query: "",
        selfAuthorId: null,
        trackedAuthorIds: [],
      })
    })
  })

  it("only asks who to track when a forge account tells who the user is", async () => {
    renderApp({
      "repository.list": () => indexOf([storefrontLine], "1 repository • 1 review target"),
      "repository.authorForm": () => forgeAuthorForm,
      "setup.searchFolders": () => noFolders,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))

    expect(await screen.findByRole("combobox", { name: "Track a user" })).toBeTruthy()
    expect(screen.queryByRole("combobox", { name: "Which user are you?" })).toBeNull()
  })

  it("keeps the form open and shows why a repository was not added", async () => {
    renderApp({
      "repository.list": () => indexOf([storefrontLine], "1 repository • 1 review target"),
      "repository.add": () => ({ errorMessage: "Pick which user you are in docs-site." }),
      "repository.authorForm": () => localGitAuthorForm,
      "setup.searchFolders": () => noFolders,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))
    fireEvent.change(screen.getByRole("combobox", { name: "Repository folder" }), { target: { value: "/work/docs-site" } })
    fireEvent.click(screen.getByRole("button", { name: "Add" }))

    const alert = await screen.findByRole("alert")

    expect(alert.textContent).toBe("Pick which user you are in docs-site.")
    expect(screen.getByRole("combobox", { name: "Repository folder" })).toBeTruthy()
  })

  it("closes the form without adding when it is cancelled", async () => {
    const addRepository = vi.fn<() => ProcedureReply>()
    renderApp({
      "repository.list": () => indexOf([storefrontLine], "1 repository • 1 review target"),
      "repository.add": addRepository,
      "repository.authorForm": () => localGitAuthorForm,
      "setup.searchFolders": () => noFolders,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByRole("combobox", { name: "Repository folder" })).toBeNull()
    expect(addRepository).not.toHaveBeenCalled()
  })

  it("searches this machine for folders as the user types and fills in the chosen one without adding it", async () => {
    const searchFolders = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({
      data: { options: [{ path: "/work/docs-site", name: "docs-site", isAdded: false, stateLabel: null }], message: null },
    })
    const addRepository = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { name: "docs-site" } })
    renderApp({
      "repository.list": () => indexOf([storefrontLine], "1 repository • 1 review target"),
      "repository.add": addRepository,
      "repository.authorForm": () => localGitAuthorForm,
      "setup.searchFolders": searchFolders,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))
    const field = await screen.findByRole("combobox", { name: "Repository folder" })
    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: "docs" } })
    fireEvent.click(await screen.findByRole("option", { name: "/work/docs-site" }))

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Repository folder" })).toHaveProperty("value", "/work/docs-site")
    })
    expect(searchFolders).toHaveBeenCalledWith({ query: "docs" })
    expect(addRepository).not.toHaveBeenCalled()
  })

  it("browses folders and chooses a repository from the list without adding it", async () => {
    const browseFolders = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({
      data: {
        path: "/work",
        parentPath: "/",
        folders: [{ name: "docs-site", path: "/work/docs-site", kind: "repository", kindLabel: "Repository" }],
        message: null,
      },
    })
    const addRepository = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { name: "docs-site" } })
    renderApp({
      "repository.list": () => indexOf([storefrontLine], "1 repository • 1 review target"),
      "repository.add": addRepository,
      "repository.authorForm": () => localGitAuthorForm,
      "setup.searchFolders": () => noFolders,
      "setup.browseFolders": browseFolders,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))
    fireEvent.click(await screen.findByRole("button", { name: "Browse folders" }))
    fireEvent.click(await screen.findByRole("button", { name: "Choose docs-site" }))

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Repository folder" })).toHaveProperty("value", "/work/docs-site")
    })
    expect(browseFolders).toHaveBeenCalledWith({ path: null, purpose: "repository" })
    expect(addRepository).not.toHaveBeenCalled()
  })

  describe("configuring a repository", () => {
    const openConfiguration = async (handlers: ProcedureHandlers) => {
      renderApp({
        "repository.list": () => indexOf([storefrontLine], "1 repository • 1 review target"),
        "repository.configuration": () => storefrontConfiguration,
        "repository.searchAuthors": () => someAuthors,
        ...handlers,
      })
      fireEvent.click(await screen.findByRole("button", { name: "Configure storefront" }))
      await screen.findByText("/work/storefront")
    }

    it("opens a dialog with the folder and the saved authors instead of leaving the page", async () => {
      await openConfiguration({})

      expect(screen.getByRole("heading", { name: "Configure storefront" })).toBeTruthy()
      expect(screen.getByText("Dev Harper")).toBeTruthy()
      expect(within(screen.getByRole("list", { name: "Tracked users" })).getByText("Lena Okafor")).toBeTruthy()
      expect(screen.getByRole("link", { name: "Prompt configurations" }).getAttribute("href")).toBe(
        "/pr-reviews/storefront/configurations",
      )
    })

    it("saves the user changed, who then is no longer tracked, and closes the dialog", async () => {
      const configure = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { name: "storefront" } })
      await openConfiguration({ "repository.configure": configure })

      fireEvent.click(screen.getByRole("button", { name: "Choose another user as you" }))
      fireEvent.focus(screen.getByRole("combobox", { name: "Which user are you?" }))
      fireEvent.click(await screen.findByRole("option", { name: /Lena Okafor/ }))
      fireEvent.click(screen.getByRole("button", { name: "Save" }))

      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: "Configure storefront" })).toBeNull()
      })
      expect(configure).toHaveBeenCalledWith({
        repositoryName: "storefront",
        selfAuthorId: "lena@acme.example",
        trackedAuthorIds: [],
      })
    })

    it("searches the saved folder of the repository along with the authors already chosen", async () => {
      const searchAuthors = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue(someAuthors)
      await openConfiguration({ "repository.searchAuthors": searchAuthors })

      fireEvent.focus(screen.getByRole("combobox", { name: "Track a user" }))

      await waitFor(() => {
        expect(searchAuthors).toHaveBeenCalledWith({
          path: "",
          repositoryName: "storefront",
          role: "tracked",
          query: "",
          selfAuthorId: "dev@acme.example",
          trackedAuthorIds: ["lena@acme.example"],
        })
      })
    })

    it("keeps the dialog open and shows why the changes were refused", async () => {
      await openConfiguration({ "repository.configure": () => ({ errorMessage: "Pick which user you are in storefront." }) })

      fireEvent.click(screen.getByRole("button", { name: "Choose another user as you" }))
      fireEvent.click(screen.getByRole("button", { name: "Save" }))

      expect((await screen.findByRole("alert")).textContent).toBe("Pick which user you are in storefront.")
      expect(screen.getByRole("heading", { name: "Configure storefront" })).toBeTruthy()
    })

    it("closes without saving when it is cancelled", async () => {
      const configure = vi.fn<() => ProcedureReply>()
      await openConfiguration({ "repository.configure": configure })

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

      expect(screen.queryByRole("heading", { name: "Configure storefront" })).toBeNull()
      expect(configure).not.toHaveBeenCalled()
    })

    it("removes the repository after the removal is confirmed, and lists the rest", async () => {
      const listRepositories = vi
        .fn<() => ProcedureReply>()
        .mockReturnValueOnce(indexOf([storefrontLine], "1 repository • 1 review target"))
        .mockReturnValue(indexOf([ledgerLine], "1 repository • Unavailable"))
      const remove = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { name: "storefront" } })
      await openConfiguration({ "repository.list": listRepositories, "repository.remove": remove })

      fireEvent.click(screen.getByRole("button", { name: "Remove repository" }))
      expect(remove).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole("button", { name: "Remove" }))

      expect(await screen.findByRole("region", { name: "ledger-api" })).toBeTruthy()
      expect(remove).toHaveBeenCalledWith({ name: "storefront" })
      expect(screen.queryByRole("region", { name: "storefront" })).toBeNull()
      expect(screen.queryByRole("heading", { name: "Configure storefront" })).toBeNull()
    })

    it("shows why the repository could not be read", async () => {
      renderApp({
        "repository.list": () => indexOf([storefrontLine], "1 repository • 1 review target"),
        "repository.configuration": () => ({ errorMessage: "storefront is no longer on the list." }),
      })

      fireEvent.click(await screen.findByRole("button", { name: "Configure storefront" }))

      expect((await screen.findByRole("alert")).textContent).toBe("storefront is no longer on the list.")
    })
  })
})

const fixtureIndexOf = (caseName: string, targetTitle: string): ProcedureReply => ({
  data: {
    kind: "repositories",
    notice: null,
    summaryLabel: "1 repository • 1 review target",
    statusFilter,
    authorFilter,
    repositories: [storefrontLine],
    fixtures: {
      caseSelect: {
        label: "Test case",
        value: caseName,
        options: [
          { value: "react-spa", label: "react-spa" },
          { value: "typescript", label: "typescript" },
        ],
      },
      repository: {
        ...docsLine,
        name: caseName,
        countLabel: "1 review target",
        content: {
          kind: "targets",
          targets: [
            {
              id: "a-snapshot",
              title: { text: targetTitle, kind: "plain" },
              details: [{ text: "#1", kind: "plain" }, { text: "a-snapshot", kind: "code" }],
              author: { name: "fixture-author", avatarUrl: null, monogram: "FA" },
              href: `/pr-reviews/${caseName}/a-snapshot`,
              branchStatus: "no-review",
              statusLabel: "No review",
              updatedLabel: "9 months ago",
            },
          ],
        },
      },
    },
  },
})

describe("the fixtures section", () => {
  it("lists the snapshots of a test case as the review targets of a repository", async () => {
    renderApp({ "repository.list": () => fixtureIndexOf("react-spa", "Implement page Wishlist") })

    const fixtures = await screen.findByRole("region", { name: "Fixtures" })
    const line = within(fixtures).getByRole("region", { name: "react-spa" })
    const stop = within(line).getByRole("link", { name: /Implement page Wishlist/ })

    expect(within(line).getByText("1 review target")).toBeTruthy()
    expect(within(stop).getByText("a-snapshot")).toBeTruthy()
    expect(within(stop).getByText("fixture-author")).toBeTruthy()
    expect(within(stop).getByText("No review")).toBeTruthy()
    expect(stop.getAttribute("href")).toBe("/pr-reviews/react-spa/a-snapshot")
  })

  it("asks the backend for the test case chosen in the select", async () => {
    const listRepositories = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValueOnce(fixtureIndexOf("react-spa", "Implement page Wishlist"))
      .mockReturnValue(fixtureIndexOf("typescript", "Modified function stockOf"))
    renderApp({ "repository.list": listRepositories })

    fireEvent.change(await screen.findByRole("combobox", { name: "Test case" }), { target: { value: "typescript" } })

    expect(await screen.findByRole("region", { name: "typescript" })).toBeTruthy()
    expect(screen.getByText("Modified function stockOf")).toBeTruthy()
    expect(listRepositories).toHaveBeenNthCalledWith(1, { statuses: null, authors: null })
    expect(listRepositories).toHaveBeenLastCalledWith({ statuses: null, authors: null, fixtureCase: "typescript" })
  })

  it("shows no fixtures section when the backend lists none", async () => {
    renderApp({ "repository.list": () => indexOf([storefrontLine], "1 repository • 1 review target") })

    await screen.findByRole("region", { name: "storefront" })

    expect(screen.queryByRole("region", { name: "Fixtures" })).toBeNull()
  })
})

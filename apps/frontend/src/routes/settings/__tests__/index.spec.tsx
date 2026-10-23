import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createApp } from "@/app"
import { fakeBackendLinks, type ProcedureHandlers, type ProcedureReply } from "@/routes/__tests__/fake-backend"
import { createTrpcClient } from "@/trpc"

const DEFAULT_EFFORT = { effort: "default", label: "Default" }

const defaultOnly = (label: string) => [
  { model: "default", label, hasEffortChoice: false, effortOptions: [DEFAULT_EFFORT], selectedEffort: "default" },
]

const agentsSection = {
  section: "agents",
  agents: [
    { agent: "claude", label: "Claude", isPicked: true, installPath: "/Users/dev/.claude", pathHint: "The folder you saved.", unavailableReason: null, model: "default", effort: "default", modelOptions: defaultOnly("Default (recommended)") },
    { agent: "codex", label: "Codex", isPicked: false, installPath: "/Users/dev/.codex", pathHint: "Found on this machine.", unavailableReason: null, model: "default", effort: "default", modelOptions: defaultOnly("Your Codex default") },
  ],
  defaultAgent: "claude",
}

const forgesSection = {
  section: "forges",
  codeHostFeatures: { label: "Connecting a git forge also enables these features.", items: ["Fetching the open pull requests of you and your team members"] },
  forges: [
    {
      forge: "github",
      label: "GitHub token",
      description: "Reaches GitHub with a token.",
      isPicked: true,
      availability: { kind: "available", statusLabel: null },
      fields: [{ name: "token", label: "Token", hint: "A token is saved. Leave this empty to keep it.", placeholder: "", value: "", isSecret: true }],
    },
  ],
}

const dev = { id: "dev@acme.example", name: "Dev Harper", detail: "dev@acme.example", avatarUrl: null, monogram: "DH" }
const lena = { id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", avatarUrl: null, monogram: "LO" }

const storefront = {
  name: "storefront",
  path: "/Users/dev/projects/storefront",
  lineColor: "blue",
  lineLabel: "S",
  authorSearchHint: "By default, Flight Plan lists only the branches you add. Add your teammates here to see their branches and yours too.",
  authorSearchPlaceholder: "Type a name or email",
  selfAuthor: dev,
  trackedAuthors: [lena],
  configurationHref: "/pr-reviews/storefront/configurations",
  emptyMessage: null,
}

const docsSite = {
  ...storefront,
  name: "docs-site",
  path: "/work/docs-site",
  authorSearchHint: "By default, Flight Plan shows everyone's pull requests in docs-site. To see only your teammates' pull requests and yours, add them here.",
  authorSearchPlaceholder: "Type a name or username",
  selfAuthor: null,
  trackedAuthors: [],
  configurationHref: "/pr-reviews/docs-site/configurations",
  emptyMessage: "No team members are picked, so Flight Plan follows everyone in this repository.",
}

const repositoriesSection = { section: "repositories", repositories: [storefront, docsSite] }

const recentOf = (name: string, stateLabel: string | null = null) => ({
  path: `/Users/dev/projects/${name}`,
  name,
  branch: "main",
  latestCommitAt: "2026-10-18T09:30:00.000Z",
  isAdded: stateLabel !== null,
  stateLabel,
})

const recentRepositories: ProcedureReply = {
  data: { repositories: [recentOf("storefront", "Already in Flight Plan"), recentOf("ledger")], message: null },
}

const reviewPreferences = {
  spotlight: ["security"],
  sectionWriteUps: { context: "always", traceDiagram: "always", blastDiagram: "on-demand", walkthrough: "on-demand", findings: "always" },
  isSegmented: true,
  walkthroughOrder: "imports-bottom-up",
  sectionOrder: ["context", "traceDiagram", "blastDiagram", "walkthrough"],
  ignoredPaths: ["**/*.spec.ts", "**/e2e/**"],
}

const reviewSection = {
  section: "review",
  presets: [
    { configurationId: "standard", label: "Standard", bestFor: "Best for general pull requests.", description: "The full review.", note: null },
    { configurationId: "custom-terse", label: "Terse", bestFor: "Based on Minimal.", description: "Few words and no filler.", note: null },
  ],
  selectedConfigurationId: "custom-terse",
  preferences: reviewPreferences,
  spotlightGroups: [
    {
      label: "Backend",
      choices: [
        { classification: "migration", label: "Migration", description: "A change to the shape of the database", isFeatured: true },
        { classification: "security", label: "Security", description: "Checks of who the caller is and what they may do, and hashing, signing, encryption and rate limiting", isFeatured: true },
      ],
    },
  ],
}

const SECTIONS: Readonly<Record<string, unknown>> = {
  agents: agentsSection,
  forges: forgesSection,
  repositories: repositoriesSection,
  review: reviewSection,
}

const sectionNameOf = (input: unknown): string =>
  typeof input === "object" && input !== null && "section" in input && typeof input.section === "string" ? input.section : ""

const getSettings = (input: unknown): ProcedureReply => ({ data: SECTIONS[sectionNameOf(input)] })

const saved = (message: string): ProcedureReply => ({ data: { kind: "saved", message } })

const renderApp = (handlers: ProcedureHandlers, path: string) =>
  render(
    createApp({
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      trpcClient: createTrpcClient(
        fakeBackendLinks({ "settings.get": getSettings, "setup.recentRepositories": () => recentRepositories, ...handlers }),
      ),
      history: createMemoryHistory({ initialEntries: [path] }),
    }),
  )

describe("the settings pages", () => {
  it("opens the agents page from /settings", async () => {
    renderApp({}, "/settings")

    expect(await screen.findByRole("heading", { level: 2, name: "Agent integration" })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeTruthy()
  })

  it("lists the five pages and says which one is open", async () => {
    renderApp({}, "/settings/forges")

    const sections = await screen.findByRole("navigation", { name: "Settings sections" })
    const links = within(sections).getAllByRole("link")

    expect(links.map((link) => link.getAttribute("href"))).toStrictEqual([
      "/settings/agents",
      "/settings/forges",
      "/settings/profiles",
      "/settings/repositories",
      "/settings/review",
    ])
    expect(links.map((link) => link.getAttribute("aria-current"))).toStrictEqual([null, "page", null, null, null])
  })

  it("is reached from the settings menu in the sign band, which also switches the colour theme", async () => {
    Reflect.defineProperty(window, "matchMedia", {
      value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
      configurable: true,
    })
    renderApp({}, "/settings/agents")
    await screen.findByRole("heading", { level: 2, name: "Agent integration" })

    fireEvent.click(screen.getByRole("button", { name: "Settings" }))
    const links = await screen.findAllByRole("menuitem")

    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toStrictEqual([
      ["Switch to dark mode", null],
      ["Agent integration", "/settings/agents"],
      ["Git integration", "/settings/forges"],
      ["Prompt configurations", "/settings/profiles"],
      ["Repositories", "/settings/repositories"],
      ["Review configuration", "/settings/review"],
    ])

    fireEvent.click(screen.getByRole("menuitem", { name: "Switch to dark mode" }))

    expect(document.documentElement.dataset.theme).toBe("dark")
    expect(localStorage.getItem("flightplan.color-theme")).toBe("dark")
    fireEvent.click(screen.getByRole("button", { name: "Settings" }))
    expect(await screen.findByRole("menuitem", { name: "Switch to light mode" })).toBeTruthy()
  })

  it("has no steps, no Back and no Continue", async () => {
    renderApp({}, "/settings/forges")

    await screen.findByRole("heading", { level: 2, name: "Git integration" })

    expect(screen.queryByRole("navigation", { name: "Setup steps" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Back" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Save and continue" })).toBeNull()
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy()
  })

  it("saves the agents, stays on the page and says they are saved", async () => {
    const save = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue(saved("Your agents are saved."))
    renderApp({ "settings.save": save }, "/settings/agents")

    fireEvent.click(await screen.findByRole("button", { name: "Save" }))

    expect(await screen.findByText("Your agents are saved.")).toBeTruthy()
    expect(save).toHaveBeenCalledWith({
      section: "agents",
      agents: [
        { agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", model: "default", effort: "default" },
        { agent: "codex", isPicked: false, installPath: "/Users/dev/.codex", model: "default", effort: "default" },
      ],
      defaultAgent: "claude",
    })
    expect(screen.getByRole("heading", { level: 2, name: "Agent integration" })).toBeTruthy()
  })

  it("shows a rejection about one field under that field", async () => {
    const save = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({
      data: { kind: "rejected", message: "GitHub did not accept this token.", field: { owner: "github", name: "token" } },
    })
    renderApp({ "settings.save": save }, "/settings/forges")

    fireEvent.change(await screen.findByLabelText("Token for GitHub token"), { target: { value: "secret" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "GitHub did not accept this token.")
    expect(screen.getByLabelText("Token for GitHub token").getAttribute("aria-invalid")).toBe("true")
    expect(save).toHaveBeenCalledWith({
      section: "forges",
      forges: [{ forge: "github", isPicked: true, username: "", token: "secret", baseUrl: "" }],
    })
  })

  it("shows a save the backend could not make above the Save button", async () => {
    renderApp({ "settings.save": () => ({ errorMessage: "The saved settings cannot be read." }) }, "/settings/forges")

    fireEvent.click(await screen.findByRole("button", { name: "Save" }))

    const alert = await screen.findByRole("alert")
    expect(within(alert).getByText("The saved settings cannot be read.")).toBeTruthy()
    expect(within(alert).getByRole("button", { name: "Troubleshoot" })).toBeTruthy()
  })

  it("says what could not be loaded", async () => {
    renderApp({ "settings.get": () => ({ errorMessage: "The saved settings cannot be read." }) }, "/settings/agents")

    expect(await screen.findByRole("heading", { name: "Could not load the settings" })).toBeTruthy()
    expect(screen.getByText("The saved settings cannot be read.")).toBeTruthy()
  })

  describe("the review configuration page", () => {
    it("draws setup step 4's form with the saved choices and the user's own configurations", async () => {
      renderApp({}, "/settings/review")

      expect(await screen.findByRole("heading", { level: 2, name: "Review configuration" })).toBeTruthy()
      expect(screen.getAllByRole("region").map((region) => within(region).getByRole("heading").textContent)).toStrictEqual([
        "Which topics do you care about most in a code review?",
        "Which parts should the agent write for you by default?",
        "Which writing style should the agent use?",
        "Code Walkthrough order",
      ])
      expect(screen.getByRole("button", { name: /Advanced options/ }).getAttribute("aria-expanded")).toBe("false")
      expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Security" }).checked).toBe(true)
      expect(screen.getByRole("button", { name: "Prompt configuration, Terse" })).toBeTruthy()
      expect(screen.getByRole("note").textContent).toContain("You can fully customize the prompt instructions")
    })

    it("saves the preferences and the default configuration together and says so", async () => {
      const save = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue(saved("Your review configuration is saved."))
      renderApp({ "settings.save": save }, "/settings/review")

      fireEvent.click(await screen.findByRole("checkbox", { name: "Migration" }))
      fireEvent.click(screen.getByRole("button", { name: "Prompt configuration, Terse" }))
      fireEvent.click(await screen.findByRole("radio", { name: /Standard/ }))
      fireEvent.click(screen.getByRole("button", { name: "Choose" }))
      fireEvent.click(screen.getByRole("button", { name: "Save" }))

      expect(await screen.findByText("Your review configuration is saved.")).toBeTruthy()
      expect(save).toHaveBeenCalledWith({
        section: "review",
        configurationId: "standard",
        preferences: { ...reviewPreferences, spotlight: ["migration", "security"] },
      })
    })

    it("reads the default again after it changes on the prompt configurations page", async () => {
      const readSettings = vi.fn<(input: unknown) => ProcedureReply>(getSettings)
      const terseRow = {
        id: "custom-terse",
        name: "Terse",
        summary: null,
        details: [],
        defaultLabel: null,
        isDefault: false,
        defaultChoiceLabel: "Use Terse by default",
        duplicateLabel: "Duplicate",
        duplicateName: "Duplicate Terse",
      }
      const configurationList = { defaultChoiceHeading: "Default", groups: [{ title: "Your configurations", rows: [terseRow], emptyMessage: null }] }
      renderApp(
        {
          "settings.get": readSettings,
          "settings.save": () => saved("Your default configuration is saved."),
          "configuration.list": () => ({ data: configurationList }),
        },
        "/settings/review",
      )
      await screen.findByRole("heading", { level: 2, name: "Review configuration" })
      const sections = screen.getByRole("navigation", { name: "Settings sections" })

      fireEvent.click(within(sections).getByRole("link", { name: /Prompt configurations/ }))
      fireEvent.click(await screen.findByRole("radio", { name: "Use Terse by default" }))
      await waitFor(() => {
        expect(screen.getByRole<HTMLInputElement>("radio", { name: "Use Terse by default" }).disabled).toBe(false)
      })
      const reviewReads = () => readSettings.mock.calls.filter(([input]) => sectionNameOf(input) === "review").length
      const readsBefore = reviewReads()
      fireEvent.click(within(sections).getByRole("link", { name: /Review configuration/ }))

      await screen.findByRole("region", { name: "Which topics do you care about most in a code review?" })
      expect(reviewReads()).toBeGreaterThan(readsBefore)
    })

    it("shows a refused path pattern under its row", async () => {
      renderApp(
        {
          "settings.save": () => ({
            data: { kind: "rejected", message: "This pattern is already in the list.", field: { owner: "ignoredPaths", name: "1" } },
          }),
        },
        "/settings/review",
      )

      fireEvent.click(await screen.findByRole("button", { name: "Save" }))

      const ignoredFiles = await screen.findByRole("region", { name: "Ignored files" })
      expect(await within(ignoredFiles).findByText("This pattern is already in the list.")).toBeTruthy()
      expect(within(ignoredFiles).getByRole("textbox", { name: "Path pattern 2" }).getAttribute("aria-invalid")).toBe("true")
    })
  })

  describe("the repositories page", () => {
    it("draws setup step 1's list: recent repositories, the followed ones checked with their team members and links", async () => {
      renderApp({}, "/settings/repositories")

      const list = await screen.findByRole("list", { name: "Repositories" })
      expect(screen.getByText(/Choose the repositories you review/)).toBeTruthy()
      expect(within(list).getByRole<HTMLInputElement>("checkbox", { name: /storefront/ }).checked).toBe(true)
      expect((await within(list).findByRole<HTMLInputElement>("checkbox", { name: /ledger/ })).checked).toBe(false)
      expect(within(list).getByRole<HTMLInputElement>("checkbox", { name: /docs-site/ }).checked).toBe(true)
      expect(within(screen.getByRole("list", { name: "Tracked team members of storefront" })).getByText("Lena Okafor")).toBeTruthy()
      expect(within(list).getAllByRole("link", { name: "Prompt configurations" }).map((link) => link.getAttribute("href"))).toStrictEqual([
        "/pr-reviews/storefront/configurations",
        "/pr-reviews/docs-site/configurations",
      ])
      expect(within(list).getByText("No team members are picked, so Flight Plan follows everyone in this repository.")).toBeTruthy()
      expect(screen.queryByRole("button", { name: /Continue|Save/ })).toBeNull()
    })

    it("follows a checked repository and stops following an unchecked one, then reads the list again", async () => {
      const add = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { name: "ledger" } })
      const remove = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { name: "docs-site" } })
      const readSettings = vi.fn<(input: unknown) => ProcedureReply>(getSettings)
      renderApp({ "settings.get": readSettings, "repository.add": add, "repository.remove": remove }, "/settings/repositories")

      const list = await screen.findByRole("list", { name: "Repositories" })
      const ledger = await within(list).findByRole("checkbox", { name: /ledger/ })
      const readsBefore = readSettings.mock.calls.length
      fireEvent.click(ledger)

      await waitFor(() => {
        expect(add).toHaveBeenCalledWith({ path: "/Users/dev/projects/ledger", trackedAuthorIds: [] })
      })
      await waitFor(() => {
        expect(readSettings.mock.calls.length).toBeGreaterThan(readsBefore)
      })
      fireEvent.click(within(list).getByRole("checkbox", { name: /docs-site/ }))

      await waitFor(() => {
        expect(remove).toHaveBeenCalledWith({ name: "docs-site" })
      })
    })

    it("saves the whole author choice when the user stops tracking a team member", async () => {
      const configure = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "accepted" } })
      renderApp({ "repository.configure": configure }, "/settings/repositories")

      fireEvent.click(await screen.findByRole("button", { name: "Stop tracking Lena Okafor" }))

      await waitFor(() => {
        expect(configure).toHaveBeenCalledWith({ repositoryName: "storefront", trackedAuthorIds: [] })
      })
    })

    it("searches team members of a followed repository with what is already chosen", async () => {
      const search = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { options: [], message: "No one matches." } })
      renderApp({ "repository.searchAuthors": search }, "/settings/repositories")

      const [, docsSiteField] = await screen.findAllByRole("combobox", { name: "Track branches from specific team members" })
      fireEvent.change(docsSiteField, { target: { value: "sam" } })

      await waitFor(() => {
        expect(search).toHaveBeenLastCalledWith({
          path: "",
          repositoryName: "docs-site",
          role: "tracked",
          query: "sam",
          trackedAuthorIds: [],
        })
      })
    })

    it("opens the Add repository dialog", async () => {
      renderApp({ "setup.searchFolders": () => ({ data: { options: [], message: null } }) }, "/settings/repositories")

      fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))

      expect(await screen.findByRole("heading", { name: "Add repository" })).toBeTruthy()
    })
  })
})

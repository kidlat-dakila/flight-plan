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
  connection: "direct",
  connectionOptions: [
    { connection: "direct", label: "Automatic", tagLabel: "Recommended", description: "It adds no billing.", unavailableFeatures: [] },
    { connection: "manual", label: "Manual", tagLabel: null, description: "Flight Plan gives you each prompt.", unavailableFeatures: ["Chatting with the agent from a review"] },
  ],
}

const forgesSection = {
  section: "forges",
  forges: [
    {
      forge: "git",
      label: "Local git",
      description: "Reviews the branches of a repository on this machine.",
      isPicked: true,
      isRequired: true,
      availability: { kind: "available", statusLabel: null },
      fields: [],
      limitation: null,
    },
    {
      forge: "github",
      label: "GitHub token",
      description: "Reaches GitHub with a token.",
      isPicked: true,
      isRequired: false,
      availability: { kind: "available", statusLabel: null },
      fields: [{ name: "token", label: "Token", hint: "A token is saved. Leave this empty to keep it.", placeholder: "", value: "", isSecret: true }],
      limitation: null,
    },
  ],
  defaultForge: "github",
}

const dev = { id: "dev@acme.example", name: "Dev Harper", detail: "dev@acme.example", avatarUrl: null, monogram: "DH" }
const lena = { id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", avatarUrl: null, monogram: "LO" }

const storefront = {
  name: "storefront",
  path: "/work/storefront",
  lineColor: "blue",
  lineLabel: "S",
  configurationHref: "/pr-reviews/storefront/configurations",
  selfAuthor: dev,
  trackedAuthors: [lena],
  emptyMessage: null,
}

const docsSite = { ...storefront, name: "docs-site", path: "/work/docs-site", selfAuthor: null, trackedAuthors: [], emptyMessage: "No team members are picked, so Flight Plan follows everyone in this repository." }

const repositoriesSection = { section: "repositories", repositories: [storefront, docsSite], emptyMessage: null }

const storefrontConfiguration: ProcedureReply = {
  data: {
    name: "storefront",
    path: "/work/storefront",
    form: { selfAuthorHint: "Git cannot tell who you are here.", searchHint: "Search by name or email.", searchPlaceholder: "Type a name or email" },
    selfAuthor: dev,
    trackedAuthors: [lena],
  },
}

const SECTIONS: Readonly<Record<string, unknown>> = {
  agents: agentsSection,
  forges: forgesSection,
  repositories: repositoriesSection,
}

const sectionNameOf = (input: unknown): string =>
  typeof input === "object" && input !== null && "section" in input && typeof input.section === "string" ? input.section : ""

const getSettings = (input: unknown): ProcedureReply => ({ data: SECTIONS[sectionNameOf(input)] })

const saved = (message: string): ProcedureReply => ({ data: { kind: "saved", message } })

const renderApp = (handlers: ProcedureHandlers, path: string) =>
  render(
    createApp({
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      trpcClient: createTrpcClient(fakeBackendLinks({ "settings.get": getSettings, ...handlers })),
      history: createMemoryHistory({ initialEntries: [path] }),
    }),
  )

describe("the settings pages", () => {
  it("opens the agents page from /settings", async () => {
    renderApp({}, "/settings")

    expect(await screen.findByRole("heading", { level: 2, name: "Agent integration" })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeTruthy()
  })

  it("lists the four pages and says which one is open", async () => {
    renderApp({}, "/settings/forges")

    const sections = await screen.findByRole("navigation", { name: "Settings sections" })
    const links = within(sections).getAllByRole("link")

    expect(links.map((link) => link.getAttribute("href"))).toStrictEqual([
      "/settings/agents",
      "/settings/forges",
      "/settings/profiles",
      "/settings/repositories",
    ])
    expect(links.map((link) => link.getAttribute("aria-current"))).toStrictEqual([null, "page", null, null])
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
      ["Git integrations", "/settings/forges"],
      ["Prompt configurations", "/settings/profiles"],
      ["Repositories", "/settings/repositories"],
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

    fireEvent.click(await screen.findByRole("radio", { name: /Manual/ }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("Your agents are saved.")).toBeTruthy()
    expect(save).toHaveBeenCalledWith({
      section: "agents",
      agents: [
        { agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", model: "default", effort: "default" },
        { agent: "codex", isPicked: false, installPath: "/Users/dev/.codex", model: "default", effort: "default" },
      ],
      defaultAgent: "claude",
      connection: "manual",
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
      forges: [
        { forge: "git", isPicked: true, username: "", token: "", baseUrl: "" },
        { forge: "github", isPicked: true, username: "", token: "secret", baseUrl: "" },
      ],
      defaultForge: "github",
    })
  })

  it("shows a save the backend could not make above the Save button", async () => {
    renderApp({ "settings.save": () => ({ errorMessage: "The saved settings cannot be read." }) }, "/settings/forges")

    fireEvent.click(await screen.findByRole("button", { name: "Save" }))

    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "The saved settings cannot be read.")
  })

  it("says what could not be loaded", async () => {
    renderApp({ "settings.get": () => ({ errorMessage: "The saved settings cannot be read." }) }, "/settings/agents")

    expect(await screen.findByRole("heading", { name: "Could not load the settings" })).toBeTruthy()
    expect(screen.getByText("The saved settings cannot be read.")).toBeTruthy()
  })

  describe("the repositories page", () => {
    it("lists each repository with its folder and the users followed in it", async () => {
      renderApp({}, "/settings/repositories")

      const users = await screen.findByRole("list", { name: "Users followed in storefront" })

      expect(within(users).getAllByRole("listitem").map((user) => user.textContent)).toStrictEqual([
        "DHDev Harperdev@acme.exampleYou",
        "LOLena Okaforlena@acme.example",
      ])
      expect(screen.getByText("/work/storefront")).toBeTruthy()
      expect(screen.getByText("No team members are picked, so Flight Plan follows everyone in this repository.")).toBeTruthy()
    })

    it("says so when there is no repository", async () => {
      const noRepositories = { section: "repositories", repositories: [], emptyMessage: "No repositories yet. Add one to start." }
      renderApp({ "settings.get": () => ({ data: noRepositories }) }, "/settings/repositories")

      expect(await screen.findByText("No repositories yet. Add one to start.")).toBeTruthy()
    })

    it("opens the Add repository dialog", async () => {
      renderApp({ "setup.searchFolders": () => ({ data: { options: [], message: null } }) }, "/settings/repositories")

      fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))

      expect(await screen.findByRole("heading", { name: "Add repository" })).toBeTruthy()
    })

    it("removes a repository from its Configure dialog and reads the list again", async () => {
      const remove = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { name: "storefront" } })
      const readSettings = vi.fn<(input: unknown) => ProcedureReply>(getSettings)
      renderApp(
        { "settings.get": readSettings, "repository.configuration": () => storefrontConfiguration, "repository.remove": remove },
        "/settings/repositories",
      )

      fireEvent.click(await screen.findByRole("button", { name: "Configure storefront" }))
      await screen.findByRole("heading", { name: "Configure storefront" })
      const readsBeforeRemoval = readSettings.mock.calls.length
      fireEvent.click(screen.getByRole("button", { name: "Remove repository" }))
      fireEvent.click(screen.getByRole("button", { name: "Remove" }))

      await waitFor(() => {
        expect(screen.queryByRole("heading", { name: "Configure storefront" })).toBeNull()
      })
      expect(remove).toHaveBeenCalledWith({ name: "storefront" })
      await waitFor(() => {
        expect(readSettings.mock.calls.length).toBeGreaterThan(readsBeforeRemoval)
      })
    })
  })
})

import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory } from "@tanstack/react-router"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createApp } from "@/app"
import { fakeBackendLinks, type ProcedureHandlers, type ProcedureReply } from "@/routes/__tests__/fake-backend"
import { createTrpcClient } from "@/trpc"

const plain = (text: string) => ({ text, kind: "plain" })

const stopOf = (step: string, label: string, state: string, isReachable: boolean, line: string) => ({
  step,
  label,
  state,
  stateLabel: state,
  isReachable,
  lines: [[plain(line)]],
})

const DEFAULT_EFFORT = { effort: "default", label: "Default" }

const CLAUDE_EFFORTS = [DEFAULT_EFFORT, { effort: "high", label: "High" }, { effort: "xhigh", label: "Extra high" }]

const defaultOnly = (label: string) => [
  { model: "default", label, hasEffortChoice: false, effortOptions: [DEFAULT_EFFORT], selectedEffort: "default" },
]

const CLAUDE_MODELS = [
  { model: "default", label: "Default (recommended)", hasEffortChoice: true, effortOptions: CLAUDE_EFFORTS, selectedEffort: "default" },
  { model: "opus", label: "Opus 5.5", hasEffortChoice: true, effortOptions: CLAUDE_EFFORTS, selectedEffort: "default" },
  { model: "sonnet", label: "Sonnet 5.5", hasEffortChoice: true, effortOptions: CLAUDE_EFFORTS, selectedEffort: "default" },
  { model: "haiku", label: "Haiku 4.5", hasEffortChoice: false, effortOptions: [DEFAULT_EFFORT], selectedEffort: "default" },
]

const agentsForm = {
  step: "agents",
  agents: [
    { agent: "claude", label: "Claude", isPicked: false, installPath: "/Users/dev/.claude", pathHint: "Found on this machine.", unavailableReason: null, model: "default", effort: "default", modelOptions: CLAUDE_MODELS },
    { agent: "codex", label: "Codex", isPicked: false, installPath: "/Users/dev/.codex", pathHint: "Found on this machine.", unavailableReason: null, model: "default", effort: "default", modelOptions: defaultOnly("Your Codex default") },
    { agent: "cursor", label: "Cursor", isPicked: false, installPath: "", pathHint: "Cursor was not found on this machine.", unavailableReason: "cursor-agent is not installed on this machine.", model: "default", effort: "default", modelOptions: defaultOnly("Your Cursor default") },
  ],
  defaultAgent: null,
}

const forgesForm = {
  step: "forges",
  codeHostFeatures: {
    label: "A code host connection adds:",
    items: ["The pull requests to review, with their labels", "Links into the code host's diff view"],
  },
  forges: [
    {
      forge: "gh",
      label: "GitHub CLI",
      description: "Reaches GitHub through the GitHub command line tool.",
      isPicked: false,
      availability: { kind: "available", statusLabel: "Signed in as dev-harper" },
      fields: [],
    },
    {
      forge: "glab",
      label: "GitLab CLI",
      description: "Reaches GitLab through the GitLab command line tool.",
      isPicked: false,
      availability: { kind: "unavailable", reason: "glab is not installed on this machine." },
      fields: [],
    },
    {
      forge: "github",
      label: "GitHub token",
      description: "Reaches GitHub with a token.",
      isPicked: false,
      availability: { kind: "available", statusLabel: null },
      fields: [
        { name: "token", label: "Token", hint: "Kept on this machine.", placeholder: "", value: "", isSecret: true },
        { name: "baseUrl", label: "Base URL", hint: "Only for a self-hosted forge.", placeholder: "", value: "", isSecret: false },
      ],
    },
  ],
}

const configurationForm = {
  step: "configuration",
  presets: [
    { configurationId: "standard", label: "Standard", bestFor: "Best for general pull requests.", description: "The full review.", note: null },
    {
      configurationId: "minimal",
      label: "Minimal",
      bestFor: "Best for saving tokens.",
      description: "Few words and no filler.",
      note: "Diagrams are off by default.",
    },
  ],
  selectedConfigurationId: "standard",
  preferences: {
    spotlight: [],
    sectionWriteUps: { context: "always", traceDiagram: "always", blastDiagram: "on-demand", walkthrough: "on-demand", findings: "always" },
    isSegmented: true,
    walkthroughOrder: "imports-bottom-up",
    sectionOrder: ["context", "traceDiagram", "blastDiagram", "walkthrough"],
    ignoredPaths: ["**/*.spec.ts", "**/e2e/**"],
  },
  spotlightChoices: [
    { classification: "migration", label: "Migration", description: "A change to the shape of the database" },
    { classification: "api-route", label: "API route", description: "A route, a resolver or a middleware" },
    { classification: "security", label: "Security", description: "Checks of who the caller is and what they may do, and hashing, signing, encryption and rate limiting" },
  ],
}

const dev = { id: "dev@acme.example", name: "Dev Harper", detail: "dev@acme.example", avatarUrl: null, monogram: "DH" }

const SELF_HINT = "Git has no email for you in this repository. Search for the name or email you commit with and pick yourself."

const lena = { id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", avatarUrl: null, monogram: "LO" }

const checkoutWeb = {
  name: "checkout-web",
  path: "/Users/dev/projects/checkout-web",
  lineColor: "blue",
  lineLabel: "C",
  authorSearchHint: "You see your own branches. Add team members to see theirs too.",
  authorSearchPlaceholder: "Type a name or email",
  selfAuthor: { hint: SELF_HINT, author: null, stateLabel: "Not chosen", isChangeable: true },
  trackedAuthors: [],
}

const checkoutWebWithSelf = { ...checkoutWeb, selfAuthor: { hint: SELF_HINT, author: dev, stateLabel: "You", isChangeable: true } }

const emptyRepositoriesForm = {
  step: "repositories",
  repositories: [],
  isReadyToContinue: false,
  continueHint: "Add at least one repository.",
}

const untrackedRepositoriesForm = {
  step: "repositories",
  repositories: [checkoutWeb],
  isReadyToContinue: false,
  continueHint: "Pick which user you are in checkout-web.",
}

const selfChosenRepositoriesForm = {
  step: "repositories",
  repositories: [checkoutWebWithSelf],
  isReadyToContinue: true,
  continueHint: null,
}

const readyRepositoriesForm = {
  step: "repositories",
  repositories: [{ ...checkoutWebWithSelf, trackedAuthors: [lena] }],
  isReadyToContinue: true,
  continueHint: null,
}

const FIRST_STEP_ROUTE = [
  stopOf("repositories", "Repositories", "current", true, "Configure which repositories and team members Flight Plan follows"),
  stopOf("forges", "Git integration", "upcoming", false, "Configure how Flight Plan communicates with your git setup"),
  stopOf("agents", "Agent integration", "upcoming", false, "Configure how Flight Plan communicates with your agent"),
  stopOf("configuration", "Review configuration", "upcoming", false, "Configure how Flight Plan puts your reviews together"),
]

const SECOND_STEP_ROUTE = [
  stopOf("repositories", "Repositories", "saved", true, "checkout-web"),
  stopOf("forges", "Git integration", "current", true, "Configure how Flight Plan communicates with your git setup"),
  stopOf("agents", "Agent integration", "upcoming", false, "Configure how Flight Plan communicates with your agent"),
  stopOf("configuration", "Review configuration", "upcoming", false, "Configure how Flight Plan puts your reviews together"),
]

const pageOf = (form: unknown, overrides: Record<string, unknown> = {}): ProcedureReply => ({
  data: { progressLabel: "Step 1 of 4", route: FIRST_STEP_ROUTE, backStep: null, form, ...overrides },
})

const forgesPage = pageOf(forgesForm, { progressLabel: "Step 2 of 4", route: SECOND_STEP_ROUTE, backStep: "repositories" })

const agentsPage = pageOf(agentsForm, { progressLabel: "Step 3 of 4", backStep: "forges" })

const configurationPage = pageOf(configurationForm, { progressLabel: "Step 4 of 4", backStep: "agents" })

const noFolders: ProcedureReply = { data: { options: [], message: null } }

const NO_RECENT_MESSAGE = "No repository in your home folder has a commit from you on main or master."

const noRecentRepositories: ProcedureReply = { data: { repositories: [], message: NO_RECENT_MESSAGE } }

const recentOf = (name: string, stateLabel: string | null = null) => ({
  path: `/Users/dev/projects/${name}`,
  name,
  branch: "main",
  latestCommitAt: "2026-10-18T09:30:00.000Z",
  isAdded: stateLabel !== null,
  stateLabel,
})

const recentRepositoriesOf = (...repositories: ReturnType<typeof recentOf>[]): ProcedureReply => ({
  data: { repositories, message: null },
})

const localGitAuthorForm: ProcedureReply = {
  data: {
    selfAuthorHint: SELF_HINT,
    gitSelfAuthor: null,
    searchHint: "Search by name or email.",
    searchPlaceholder: "Type a name or email",
  },
}

const forgeAuthorForm: ProcedureReply = {
  data: { selfAuthorHint: null, gitSelfAuthor: null, searchHint: "Search by name or username.", searchPlaceholder: "Type a name or username" },
}

const incompleteSetupGate = (input: unknown): ProcedureReply => ({
  data: { redirectTo: JSON.stringify(input).includes("/setup") ? null : "/setup" },
})

const savedPreferences = (input: unknown): ProcedureReply => ({ data: { kind: "saved", preferences: input } })

const renderApp = (handlers: ProcedureHandlers, path = "/setup") =>
  render(
    createApp({
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      trpcClient: createTrpcClient(
        fakeBackendLinks({
          "setup.gate": incompleteSetupGate,
          "setup.recentRepositories": () => noRecentRepositories,
          "reviewPreferences.save": savedPreferences,
          ...handlers,
        }),
      ),
      history: createMemoryHistory({ initialEntries: [path] }),
    }),
  )

describe("the setup page", () => {
  it("is where every page leads until the setup is complete", async () => {
    renderApp({ "setup.get": () => pageOf(agentsForm) }, "/")

    expect(await screen.findByRole("heading", { name: "Agent integration" })).toBeTruthy()
  })

  it("has no link to the settings while the setup is not complete", async () => {
    renderApp({ "setup.get": () => pageOf(agentsForm) })

    await screen.findByRole("heading", { name: "Agent integration" })

    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull()
  })

  it("draws the four steps as stops and says which step is open", async () => {
    renderApp({ "setup.get": () => pageOf(emptyRepositoriesForm), "setup.searchFolders": () => noFolders })

    const steps = await screen.findByRole("navigation", { name: "Setup steps" })

    expect(within(steps).getAllByRole("listitem").map((stop) => stop.textContent)).toStrictEqual([
      "Repositories, currentConfigure which repositories and team members Flight Plan follows",
      "Git integration, upcomingConfigure how Flight Plan communicates with your git setup",
      "Agent integration, upcomingConfigure how Flight Plan communicates with your agent",
      "Review configuration, upcomingConfigure how Flight Plan puts your reviews together",
    ])
    expect(within(steps).getByText("Repositories").getAttribute("aria-current")).toBe("step")
    expect(within(steps).queryByRole("link")).toBeNull()
    expect(screen.queryByRole("link", { name: "Back" })).toBeNull()
    expect(screen.getByRole("heading", { level: 1, name: "Welcome to Flight Plan" })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 2, name: "Select your repositories" })).toBeTruthy()
  })

  it("links back to a saved step and to no step that is not reached", async () => {
    renderApp({ "setup.get": () => forgesPage })

    const steps = await screen.findByRole("navigation", { name: "Setup steps" })

    expect(within(steps).getByRole("link", { name: "Repositories" }).getAttribute("href")).toBe("/setup?step=repositories")
    expect(within(steps).getAllByRole("link")).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Back" }).getAttribute("href")).toBe("/setup?step=repositories")
  })

  it("explains that Flight Plan builds the review and the agent explains the change", async () => {
    renderApp({ "setup.get": () => agentsPage })

    const intro = await screen.findByText(/Flight Plan builds almost everything on its own/)

    expect(intro.textContent).toContain("What it can't do is explain how the code works or find potential issues.")
    expect(intro.textContent).toContain("That's where your agent comes in")
  })

  it("asks for an install folder only for a picked agent, prefilled with the detected one", async () => {
    renderApp({ "setup.get": () => pageOf(agentsForm) })

    fireEvent.click(await screen.findByRole("checkbox", { name: "Claude" }))

    expect(screen.getByLabelText<HTMLInputElement>("Install folder for Claude").value).toBe("/Users/dev/.claude")
    expect(screen.queryByLabelText("Install folder for Codex")).toBeNull()
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Default agent: Codex" }).disabled).toBe(true)
  })

  it("browses for an agent's install folder and fills the field with the chosen one", async () => {
    const browseFolders = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValueOnce({
        data: {
          path: "/Users/dev/.claude",
          parentPath: "/Users/dev",
          folders: [],
          message: "This folder has no folders inside it.",
        },
      })
      .mockReturnValue({
        data: {
          path: "/Users/dev",
          parentPath: "/Users",
          folders: [{ name: ".claude-work", path: "/Users/dev/.claude-work", kind: "folder", kindLabel: "Folder" }],
          message: null,
        },
      })
    renderApp({ "setup.get": () => pageOf(agentsForm), "setup.browseFolders": browseFolders })

    fireEvent.click(await screen.findByRole("checkbox", { name: "Claude" }))
    fireEvent.click(screen.getByRole("button", { name: "Browse for the Claude install folder" }))
    fireEvent.click(await screen.findByRole("button", { name: "Up one folder" }))
    await screen.findByRole("button", { name: "Open .claude-work" })

    expect(browseFolders).toHaveBeenNthCalledWith(1, { path: "/Users/dev/.claude", purpose: "install-folder" })
    expect(browseFolders).toHaveBeenLastCalledWith({ path: "/Users/dev", purpose: "install-folder" })

    fireEvent.click(screen.getByRole("button", { name: "Use this folder" }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
    expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Install folder for Claude" }).value).toBe("/Users/dev")
  })

  it("shows an agent whose command line program is missing as unavailable, with the reason", async () => {
    renderApp({ "setup.get": () => pageOf(agentsForm) })

    const cursor = await screen.findByRole<HTMLInputElement>("checkbox", { name: /Cursor/ })

    expect(cursor.disabled).toBe(true)
    expect(screen.getByText("cursor-agent is not installed on this machine.", { exact: false })).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Claude" }).disabled).toBe(false)
  })

  it("asks no way of talking to the agent, since Flight Plan always starts it itself", async () => {
    renderApp({ "setup.get": () => pageOf(agentsForm) })

    expect(await screen.findByRole("checkbox", { name: "Claude" })).toBeTruthy()
    expect(screen.queryByRole("radio", { name: /Manual/ })).toBeNull()
    expect(screen.queryByRole("radio", { name: /Automatic/ })).toBeNull()
  })

  it("saves the agents and opens the next step", async () => {
    const getSetup = vi.fn<() => ProcedureReply>().mockReturnValueOnce(agentsPage).mockReturnValue(configurationPage)
    const saveStep = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "accepted", nextStep: "configuration" } })
    renderApp({ "setup.get": getSetup, "setup.saveStep": saveStep })

    fireEvent.click(await screen.findByRole("checkbox", { name: "Claude" }))
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }))

    expect(await screen.findByRole("heading", { name: "Review configuration" })).toBeTruthy()
    expect(saveStep).toHaveBeenCalledWith({
      step: "agents",
      agents: [
        { agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", model: "default", effort: "default" },
        { agent: "codex", isPicked: false, installPath: "/Users/dev/.codex", model: "default", effort: "default" },
        { agent: "cursor", isPicked: false, installPath: "", model: "default", effort: "default" },
      ],
      defaultAgent: null,
    })
  })

  it("offers the models of a picked agent and saves the one chosen", async () => {
    const saveStep = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "accepted", nextStep: "configuration" } })
    renderApp({ "setup.get": () => pageOf(agentsForm), "setup.saveStep": saveStep })

    fireEvent.click(await screen.findByRole("checkbox", { name: "Claude" }))
    const models = screen.getByRole<HTMLSelectElement>("combobox", { name: "Model for Claude" })

    expect(within(models).getAllByRole("option").map((option) => option.textContent)).toStrictEqual([
      "Default (recommended)",
      "Opus 5.5",
      "Sonnet 5.5",
      "Haiku 4.5",
    ])
    expect(models.value).toBe("default")
    fireEvent.change(models, { target: { value: "sonnet" } })
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }))

    await waitFor(() => {
      expect(saveStep).toHaveBeenCalled()
    })
    expect(saveStep.mock.calls[0]?.[0]).toMatchObject({
      agents: [
        { agent: "claude", isPicked: true, model: "sonnet" },
        { agent: "codex", model: "default" },
        { agent: "cursor", model: "default" },
      ],
    })
  })

  it("offers the efforts of the chosen model, saves the one chosen and starts again when the model changes", async () => {
    const saveStep = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "accepted", nextStep: "configuration" } })
    renderApp({ "setup.get": () => pageOf(agentsForm), "setup.saveStep": saveStep })

    fireEvent.click(await screen.findByRole("checkbox", { name: "Claude" }))
    const efforts = screen.getByRole("group", { name: "Effort for Claude" })

    expect(within(efforts).getByRole<HTMLInputElement>("radio", { name: "Default" }).checked).toBe(true)

    fireEvent.click(within(efforts).getByRole("radio", { name: "Extra high" }))
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }))

    await waitFor(() => {
      expect(saveStep).toHaveBeenCalled()
    })
    expect(saveStep.mock.calls[0]?.[0]).toMatchObject({
      agents: [{ agent: "claude", model: "default", effort: "xhigh" }, { effort: "default" }, { effort: "default" }],
    })

    fireEvent.change(screen.getByRole("combobox", { name: "Model for Claude" }), { target: { value: "haiku" } })

    expect(screen.queryByRole("group", { name: "Effort for Claude" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }))

    await waitFor(() => {
      expect(saveStep).toHaveBeenCalledTimes(2)
    })
    expect(saveStep.mock.calls[1]?.[0]).toMatchObject({ agents: [{ agent: "claude", model: "haiku", effort: "default" }, {}, {}] })
  })

  it("shows a rejected effort under that agent's settings", async () => {
    renderApp({
      "setup.get": () => pageOf(agentsForm),
      "setup.saveStep": () => ({
        data: { kind: "rejected", message: "Choose one of the efforts Opus 5.5 offers.", field: { owner: "claude", name: "effort" } },
      }),
    })

    fireEvent.click(await screen.findByRole("checkbox", { name: "Claude" }))
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }))

    expect((await screen.findByRole("alert")).textContent).toBe("Choose one of the efforts Opus 5.5 offers.")
    expect(screen.getByRole("textbox", { name: "Install folder for Claude" }).getAttribute("aria-invalid")).toBe("false")
  })

  it("describes that agent's models with a rejected model", async () => {
    renderApp({
      "setup.get": () => pageOf(agentsForm),
      "setup.saveStep": () => ({
        data: { kind: "rejected", message: "Choose one of the models Claude offers.", field: { owner: "claude", name: "model" } },
      }),
    })

    fireEvent.click(await screen.findByRole("checkbox", { name: "Claude" }))
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toBe("Choose one of the models Claude offers.")
    expect(screen.getByRole("combobox", { name: "Model for Claude" }).getAttribute("aria-describedby")).toBe(alert.id)
  })

  it("keeps the step open and shows why it was not saved", async () => {
    renderApp({
      "setup.get": () => pageOf(agentsForm),
      "setup.saveStep": () => ({ data: { kind: "rejected", message: "Pick at least one agent.", field: null } }),
    })

    fireEvent.click(await screen.findByRole("button", { name: "Save and continue" }))

    expect((await screen.findByRole("alert")).textContent).toBe("Pick at least one agent.")
    expect(screen.getByRole("heading", { name: "Agent integration" })).toBeTruthy()
  })

  it("puts a rejection on the field it is about", async () => {
    renderApp({
      "setup.get": () => pageOf(agentsForm),
      "setup.saveStep": () => ({
        data: {
          kind: "rejected",
          message: "Enter the full path of the folder where Codex keeps its configuration.",
          field: { owner: "codex", name: "installPath" },
        },
      }),
    })

    fireEvent.click(await screen.findByRole("checkbox", { name: "Codex" }))
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }))

    const alert = await screen.findByRole("alert")
    const field = screen.getByLabelText("Install folder for Codex")

    expect(alert.textContent).toBe("Enter the full path of the folder where Codex keeps its configuration.")
    expect(field.getAttribute("aria-invalid")).toBe("true")
    expect(field.getAttribute("aria-describedby")).toContain(alert.id)
    expect(screen.getAllByRole("alert")).toHaveLength(1)
  })

  it("reports a save the backend could not handle", async () => {
    renderApp({
      "setup.get": () => pageOf(agentsForm),
      "setup.saveStep": () => ({ errorMessage: "The data directory cannot be written." }),
    })

    fireEvent.click(await screen.findByRole("button", { name: "Save and continue" }))

    expect((await screen.findByRole("alert")).textContent).toBe("The data directory cannot be written.")
  })

  it("explains how Flight Plan works with git and what a code host adds", async () => {
    renderApp({ "setup.get": () => forgesPage })

    expect(await screen.findByText(/never commits, pushes or rewrites your history\./)).toBeTruthy()
    expect(screen.getByText("A code host connection adds:")).toBeTruthy()
    expect(screen.getByText("Links into the code host's diff view")).toBeTruthy()
    expect(screen.getByRole("list", { name: "Code hosts" })).toBeTruthy()
    expect(screen.queryByRole("radio")).toBeNull()
    expect(screen.queryByRole("checkbox", { name: /Local git/ })).toBeNull()
    expect(screen.queryByRole("radio", { name: /Default forge/ })).toBeNull()
  })

  it("shows a code host that cannot be used as unavailable, with the reason", async () => {
    renderApp({ "setup.get": () => forgesPage })

    const gitlabCli = await screen.findByRole<HTMLInputElement>("checkbox", { name: /GitLab CLI/ })

    expect(gitlabCli.disabled).toBe(true)
    expect(screen.getByText(/glab is not installed on this machine\./).classList.contains("text-destructive")).toBe(true)
    expect(screen.getByText("Signed in as dev-harper")).toBeTruthy()
  })

  it("saves local git only when no code host is checked", async () => {
    const saveStep = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "accepted", nextStep: "agents" } })
    renderApp({ "setup.get": () => forgesPage, "setup.saveStep": saveStep })

    fireEvent.click(await screen.findByRole("button", { name: "Save and continue" }))

    await waitFor(() => {
      expect(saveStep).toHaveBeenCalledWith({
        step: "forges",
        forges: [
          { forge: "gh", isPicked: false, username: "", token: "", baseUrl: "" },
          { forge: "glab", isPicked: false, username: "", token: "", baseUrl: "" },
          { forge: "github", isPicked: false, username: "", token: "", baseUrl: "" },
        ],
      })
    })
  })

  it("skips the git integration with local git only, whatever was checked, and opens the next step", async () => {
    const getSetup = vi.fn<() => ProcedureReply>().mockReturnValueOnce(forgesPage).mockReturnValue(agentsPage)
    const saveStep = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "accepted", nextStep: "agents" } })
    renderApp({ "setup.get": getSetup, "setup.saveStep": saveStep })

    fireEvent.click(await screen.findByRole("checkbox", { name: /GitHub token/ }))
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }))

    expect(await screen.findByRole("heading", { name: "Agent integration" })).toBeTruthy()
    expect(saveStep).toHaveBeenCalledWith({ step: "forges", forges: [] })
  })

  it("asks a token forge for its token in a hidden field and sends it with the step", async () => {
    const saveStep = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "accepted", nextStep: "agents" } })
    renderApp({ "setup.get": () => forgesPage, "setup.saveStep": saveStep })

    fireEvent.click(await screen.findByRole("checkbox", { name: /GitHub token/ }))
    const token = screen.getByLabelText<HTMLInputElement>("Token for GitHub token")
    fireEvent.change(token, { target: { value: "secret" } })
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }))

    await waitFor(() => {
      expect(saveStep).toHaveBeenCalledTimes(1)
    })
    expect(token.type).toBe("password")
    expect(saveStep).toHaveBeenCalledWith({
      step: "forges",
      forges: [
        { forge: "gh", isPicked: false, username: "", token: "", baseUrl: "" },
        { forge: "glab", isPicked: false, username: "", token: "", baseUrl: "" },
        { forge: "github", isPicked: true, username: "", token: "secret", baseUrl: "" },
      ],
    })
  })

  it("explains what a prompt configuration is and saves the chosen one", async () => {
    const saveStep = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "accepted", nextStep: "configuration" } })
    renderApp({
      "setup.get": () => configurationPage,
      "setup.saveStep": saveStep,
      "setup.complete": () => ({ data: { redirectTo: "/" } }),
      "repository.list": () => ({ data: { kind: "empty", notice: null, fixtures: null } }),
    })

    expect(await screen.findByRole("heading", { level: 2, name: "Review configuration" })).toBeTruthy()
    expect(screen.getByRole("region", { name: "Prompt configuration" })).toBeTruthy()
    expect(screen.getByText(/A prompt configuration is the set of instructions the agent follows/)).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>("radio", { name: /Standard/ }).checked).toBe(true)
    expect(screen.getByText("You can pick another prompt configuration each time you create a Flight Plan.")).toBeTruthy()
    expect(screen.getByText("You can make your own later, in the settings.")).toBeTruthy()

    fireEvent.click(screen.getByRole("radio", { name: /Minimal/ }))
    fireEvent.click(screen.getByRole("button", { name: "Finish setup" }))

    await waitFor(() => {
      expect(saveStep).toHaveBeenCalledWith({ step: "configuration", configurationId: "minimal" })
    })
  })

  it("asks which kinds of change go in the spotlight and saves them before the step", async () => {
    const savePreferences = vi.fn(savedPreferences)
    const saveStep = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "accepted", nextStep: "configuration" } })
    renderApp({
      "setup.get": () => configurationPage,
      "reviewPreferences.save": savePreferences,
      "setup.saveStep": saveStep,
      "setup.complete": () => ({ data: { redirectTo: "/" } }),
      "repository.list": () => ({ data: { kind: "empty", notice: null, fixtures: null } }),
    })

    const spotlight = await screen.findByRole("region", { name: "Spotlight" })
    expect(within(spotlight).getByText(/Pick the kinds of change that matter most to you/)).toBeTruthy()
    expect(within(spotlight).getByText(/Nothing is in the spotlight/)).toBeTruthy()
    expect(within(spotlight).getByRole("button", { name: "Security", description: "Checks of who the caller is and what they may do, and hashing, signing, encryption and rate limiting" })).toBeTruthy()

    fireEvent.click(within(spotlight).getByRole("button", { name: "Security" }))
    fireEvent.click(within(spotlight).getByRole("button", { name: "Migration" }))

    expect(within(spotlight).getByRole("button", { name: "Security", pressed: true })).toBeTruthy()
    expect(within(spotlight).queryByText(/Nothing is in the spotlight/)).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Finish setup" }))

    await waitFor(() => {
      expect(saveStep).toHaveBeenCalledWith({ step: "configuration", configurationId: "standard" })
    })
    expect(savePreferences).toHaveBeenCalledWith({ ...configurationForm.preferences, spotlight: ["migration", "security"] })
  })

  it("asks which parts the agent writes up by default and saves the answers", async () => {
    const savePreferences = vi.fn(savedPreferences)
    renderApp({
      "setup.get": () => configurationPage,
      "reviewPreferences.save": savePreferences,
      "setup.saveStep": () => ({ data: { kind: "accepted", nextStep: "configuration" } }),
      "setup.complete": () => ({ data: { redirectTo: "/" } }),
      "repository.list": () => ({ data: { kind: "empty", notice: null, fixtures: null } }),
    })

    const writeUps = await screen.findByRole("region", { name: "Write-ups" })
    expect(within(writeUps).getByText(/Which parts should the agent write up by default\?/)).toBeTruthy()
    const findings = within(writeUps).getByRole("group", { name: "Findings" })
    expect(within(findings).getByRole<HTMLInputElement>("radio", { name: "Always" }).checked).toBe(true)

    fireEvent.click(within(findings).getByRole("radio", { name: "On demand" }))
    fireEvent.click(screen.getByRole("button", { name: "Finish setup" }))

    await waitFor(() => {
      expect(savePreferences).toHaveBeenCalledWith({
        ...configurationForm.preferences,
        sectionWriteUps: { ...configurationForm.preferences.sectionWriteUps, findings: "on-demand" },
      })
    })
  })

  it("asks how a review is organized and arranged and saves the answers", async () => {
    const savePreferences = vi.fn(savedPreferences)
    renderApp({
      "setup.get": () => configurationPage,
      "reviewPreferences.save": savePreferences,
      "setup.saveStep": () => ({ data: { kind: "accepted", nextStep: "configuration" } }),
      "setup.complete": () => ({ data: { redirectTo: "/" } }),
      "repository.list": () => ({ data: { kind: "empty", notice: null, fixtures: null } }),
    })

    const organization = await screen.findByRole("region", { name: "Review organization" })
    const segments = within(organization).getByRole<HTMLInputElement>("checkbox", { name: /Split reviews into segments/ })
    expect(segments.checked).toBe(true)
    expect(within(organization).getByRole<HTMLInputElement>("radio", { name: /Bottom up/ }).checked).toBe(true)

    fireEvent.click(segments)
    fireEvent.click(within(organization).getByRole("radio", { name: /Top down/ }))
    fireEvent.click(within(screen.getByRole("region", { name: "Display arrangement" })).getByRole("button", { name: "Move Context down" }))
    fireEvent.click(screen.getByRole("button", { name: "Finish setup" }))

    await waitFor(() => {
      expect(savePreferences).toHaveBeenCalledWith({
        ...configurationForm.preferences,
        isSegmented: false,
        walkthroughOrder: "imports-top-down",
        sectionOrder: ["traceDiagram", "context", "blastDiagram", "walkthrough"],
      })
    })
  })

  it("lists the ignored path patterns and saves the ones the user adds and removes", async () => {
    const savePreferences = vi.fn(savedPreferences)
    renderApp({
      "setup.get": () => configurationPage,
      "reviewPreferences.save": savePreferences,
      "setup.saveStep": () => ({ data: { kind: "accepted", nextStep: "configuration" } }),
      "setup.complete": () => ({ data: { redirectTo: "/" } }),
      "repository.list": () => ({ data: { kind: "empty", notice: null, fixtures: null } }),
    })

    const ignoredFiles = await screen.findByRole("region", { name: "Ignored files" })
    expect(within(ignoredFiles).getByText(/as in a \.gitignore/)).toBeTruthy()

    fireEvent.click(within(ignoredFiles).getByRole("button", { name: "Remove **/e2e/**" }))
    fireEvent.click(within(ignoredFiles).getByRole("button", { name: "Add pattern" }))
    fireEvent.change(within(ignoredFiles).getByRole("textbox", { name: "Path pattern 2" }), { target: { value: "**/*.stories.tsx" } })
    fireEvent.click(screen.getByRole("button", { name: "Finish setup" }))

    await waitFor(() => {
      expect(savePreferences).toHaveBeenCalledWith({ ...configurationForm.preferences, ignoredPaths: ["**/*.spec.ts", "**/*.stories.tsx"] })
    })
  })

  it("does not save the step when the review preferences are refused", async () => {
    const saveStep = vi.fn<(input: unknown) => ProcedureReply>()
    renderApp({
      "setup.get": () => configurationPage,
      "reviewPreferences.save": () => ({
        data: { kind: "rejected", message: "This pattern is already in the list.", field: { owner: "ignoredPaths", name: "1" } },
      }),
      "setup.saveStep": saveStep,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Finish setup" }))

    const ignoredFiles = screen.getByRole("region", { name: "Ignored files" })
    expect(await within(ignoredFiles).findByText("This pattern is already in the list.")).toBeTruthy()
    expect(within(ignoredFiles).getByRole("textbox", { name: "Path pattern 2" }).getAttribute("aria-invalid")).toBe("true")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(saveStep).not.toHaveBeenCalled()
  })

  it("lists the user's recent repositories and follows the one checked", async () => {
    const getSetup = vi
      .fn<() => ProcedureReply>()
      .mockReturnValueOnce(pageOf(emptyRepositoriesForm))
      .mockReturnValue(pageOf({ ...selfChosenRepositoriesForm, repositories: [{ ...checkoutWebWithSelf, selfAuthor: null }] }))
    const addRepository = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "accepted" } })
    renderApp({
      "setup.get": getSetup,
      "setup.recentRepositories": () => recentRepositoriesOf(recentOf("checkout-web"), recentOf("storefront")),
      "setup.addRepository": addRepository,
    })

    const repositories = await screen.findByRole("list", { name: "Repositories" })
    const checkoutWebRow = within(repositories).getByRole<HTMLInputElement>("checkbox", { name: /^checkout-web/ })

    expect(within(repositories).getAllByRole("checkbox")).toHaveLength(2)
    expect(checkoutWebRow.checked).toBe(false)
    expect(within(repositories).getByText("/Users/dev/projects/checkout-web")).toBeTruthy()
    expect(screen.queryByRole("combobox", { name: "Track specific team members in checkout-web" })).toBeNull()

    fireEvent.click(checkoutWebRow)

    expect(await screen.findByRole("combobox", { name: "Track specific team members in checkout-web" })).toBeTruthy()
    expect(addRepository).toHaveBeenCalledWith({ path: "/Users/dev/projects/checkout-web", selfAuthorId: null, trackedAuthorIds: [] })
    expect(within(repositories).getByRole<HTMLInputElement>("checkbox", { name: /^checkout-web/ }).checked).toBe(true)
  })

  it("stays on the repositories step after following the first repository", async () => {
    const addRepository = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { kind: "accepted" } })
    const getSetup = (input: unknown): ProcedureReply => {
      const isStepRequested = JSON.stringify(input).includes("repositories")
      if (addRepository.mock.calls.length === 0) return pageOf(emptyRepositoriesForm)
      return isStepRequested ? pageOf(selfChosenRepositoriesForm) : forgesPage
    }
    renderApp({
      "setup.get": getSetup,
      "setup.recentRepositories": () => recentRepositoriesOf(recentOf("checkout-web")),
      "setup.addRepository": addRepository,
    })

    const repositories = await screen.findByRole("list", { name: "Repositories" })
    fireEvent.click(within(repositories).getByRole("checkbox", { name: /^checkout-web/ }))

    expect(await screen.findByRole("combobox", { name: "Track specific team members in checkout-web" })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 2, name: "Select your repositories" })).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "Git integration" })).toBeNull()
  })

  it("keeps a repository Flight Plan already follows checked and locked", async () => {
    renderApp({
      "setup.get": () => pageOf(emptyRepositoriesForm),
      "setup.recentRepositories": () => recentRepositoriesOf(recentOf("storefront", "Already in Flight Plan")),
    })

    const storefront = await screen.findByRole<HTMLInputElement>("checkbox", { name: /^storefront/ })

    expect(storefront.checked).toBe(true)
    expect(storefront.disabled).toBe(true)
    expect(screen.getByText("Already in Flight Plan")).toBeTruthy()
  })

  it("lists a repository added by hand after the recent ones, checked", async () => {
    renderApp({
      "setup.get": () => pageOf(selfChosenRepositoriesForm),
      "setup.recentRepositories": () => recentRepositoriesOf(recentOf("storefront")),
    })

    const repositories = await screen.findByRole("list", { name: "Repositories" })
    await within(repositories).findByRole("checkbox", { name: /^storefront/ })
    const rows = within(repositories).getAllByRole<HTMLInputElement>("checkbox")

    expect(rows.map((row) => [row.closest("label")?.querySelector(".font-bold")?.textContent, row.checked])).toStrictEqual([
      ["storefront", false],
      ["checkout-web", true],
    ])
  })

  it("holds the repositories step and says what is missing", async () => {
    renderApp({ "setup.get": () => pageOf(emptyRepositoriesForm), "setup.searchFolders": () => noFolders })

    const saveAndContinue = await screen.findByRole<HTMLButtonElement>("button", { name: "Save and continue" })

    expect(saveAndContinue.disabled).toBe(true)
    expect(screen.getByText("Add at least one repository.")).toBeTruthy()
    expect(await screen.findByText(NO_RECENT_MESSAGE)).toBeTruthy()
  })

  it("searches for repository folders as the user types, then adds the chosen folder with its authors", async () => {
    const searchFolders = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({
      data: {
        options: [{ path: "/Users/dev/projects/checkout-web", name: "checkout-web", isAdded: false, stateLabel: null }],
        message: null,
      },
    })
    const getSetup = vi
      .fn<() => ProcedureReply>()
      .mockReturnValueOnce(pageOf(emptyRepositoriesForm))
      .mockReturnValue(pageOf(selfChosenRepositoriesForm))
    const searchAuthors = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({
      data: { options: [{ ...dev, isTaken: false, stateLabel: null }], message: null },
    })
    const addRepository = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { name: "checkout-web" } })
    renderApp({
      "setup.get": getSetup,
      "setup.searchFolders": searchFolders,
      "repository.authorForm": () => localGitAuthorForm,
      "repository.searchAuthors": searchAuthors,
      "setup.addRepository": addRepository,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))
    const field = await screen.findByRole("combobox", { name: "Repository folder" })
    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: "check" } })
    fireEvent.click(await screen.findByRole("option", { name: "/Users/dev/projects/checkout-web" }))
    expect(addRepository).not.toHaveBeenCalled()
    fireEvent.focus(await screen.findByRole("combobox", { name: "Which user are you?" }))
    fireEvent.click(await screen.findByRole("option", { name: /Dev Harper/ }))
    fireEvent.click(screen.getByRole("button", { name: "Add" }))

    expect((await screen.findByRole<HTMLInputElement>("checkbox", { name: /^checkout-web/ })).checked).toBe(true)
    expect(searchFolders).toHaveBeenCalledWith({ query: "check" })
    expect(searchAuthors).toHaveBeenCalledWith({
      path: "/Users/dev/projects/checkout-web",
      repositoryName: null,
      role: "self",
      query: "",
      selfAuthorId: null,
      trackedAuthorIds: [],
    })
    expect(addRepository).toHaveBeenCalledWith({
      path: "/Users/dev/projects/checkout-web",
      selfAuthorId: "dev@acme.example",
      trackedAuthorIds: [],
    })
    await waitFor(() => {
      expect(screen.queryByRole("combobox", { name: "Repository folder" })).toBeNull()
    })
  })

  it("only asks who to track in the dialog when a forge account tells who the user is", async () => {
    renderApp({
      "setup.get": () => pageOf(emptyRepositoriesForm),
      "setup.searchFolders": () => noFolders,
      "repository.authorForm": () => forgeAuthorForm,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))

    expect(await screen.findByRole("combobox", { name: "Track specific team members" })).toBeTruthy()
    expect(screen.queryByRole("combobox", { name: "Which user are you?" })).toBeNull()
  })

  it("browses folders, opens one and chooses a repository from it without adding it", async () => {
    const browseFolders = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValueOnce({
        data: {
          path: "/Users/dev",
          parentPath: "/Users",
          folders: [{ name: "projects", path: "/Users/dev/projects", kind: "folder", kindLabel: "Folder" }],
          message: null,
        },
      })
      .mockReturnValue({
        data: {
          path: "/Users/dev/projects",
          parentPath: "/Users/dev",
          folders: [
            {
              name: "checkout-web",
              path: "/Users/dev/projects/checkout-web",
              kind: "repository",
              kindLabel: "Repository",
            },
            {
              name: "storefront",
              path: "/Users/dev/projects/storefront",
              kind: "added-repository",
              kindLabel: "Already in Flight Plan",
            },
          ],
          message: null,
        },
      })
    const addRepository = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { name: "checkout-web" } })
    renderApp({
      "setup.get": () => pageOf(emptyRepositoriesForm),
      "setup.searchFolders": () => noFolders,
      "setup.browseFolders": browseFolders,
      "repository.authorForm": () => localGitAuthorForm,
      "setup.addRepository": addRepository,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))
    fireEvent.click(await screen.findByRole("button", { name: "Browse folders" }))
    fireEvent.click(await screen.findByRole("button", { name: "Open projects" }))
    const chooseCheckoutWeb = await screen.findByRole("button", { name: "Choose checkout-web" })

    expect(screen.getByText("Already in Flight Plan")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Choose storefront" })).toBeNull()

    fireEvent.click(chooseCheckoutWeb)

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Repository folder" })).toHaveProperty(
        "value",
        "/Users/dev/projects/checkout-web",
      )
    })
    expect(browseFolders).toHaveBeenLastCalledWith({ path: "/Users/dev/projects", purpose: "repository" })
    expect(addRepository).not.toHaveBeenCalled()
  })

  it("keeps the dialog open with the reason when the repository is refused", async () => {
    const addRepository = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({
      errorMessage: "/work/notes is not a git repository.",
    })
    renderApp({
      "setup.get": () => pageOf(emptyRepositoriesForm),
      "setup.searchFolders": () => noFolders,
      "repository.authorForm": () => localGitAuthorForm,
      "setup.addRepository": addRepository,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))
    fireEvent.change(await screen.findByRole("combobox", { name: "Repository folder" }), { target: { value: "/work/notes" } })
    fireEvent.click(screen.getByRole("button", { name: "Add" }))

    expect((await screen.findByRole("alert")).textContent).toBe("/work/notes is not a git repository.")
    expect(addRepository).toHaveBeenCalledWith({ path: "/work/notes", selfAuthorId: null, trackedAuthorIds: [] })
  })

  it("closes the dialog without adding when it is cancelled", async () => {
    const addRepository = vi.fn<(input: unknown) => ProcedureReply>()
    renderApp({
      "setup.get": () => pageOf(emptyRepositoriesForm),
      "setup.searchFolders": () => noFolders,
      "repository.authorForm": () => localGitAuthorForm,
      "setup.addRepository": addRepository,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Add repository" }))
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }))

    expect(screen.queryByRole("combobox", { name: "Repository folder" })).toBeNull()
    expect(addRepository).not.toHaveBeenCalled()
  })

  it("asks a local git user which user they are, in a field of its own, and saves the choice", async () => {
    const searchAuthors = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({
      data: { options: [{ ...dev, isTaken: false, stateLabel: null }], message: null },
    })
    const getSetup = vi
      .fn<() => ProcedureReply>()
      .mockReturnValueOnce(pageOf(untrackedRepositoriesForm))
      .mockReturnValue(pageOf(selfChosenRepositoriesForm))
    const setSelfAuthor = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { authorId: dev.id } })
    renderApp({
      "setup.get": getSetup,
      "setup.searchFolders": () => noFolders,
      "setup.searchAuthors": searchAuthors,
      "setup.setSelfAuthor": setSelfAuthor,
    })

    const field = await screen.findByRole("combobox", { name: "Which user are you in checkout-web?" })
    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: "dev" } })
    fireEvent.click(await screen.findByRole("option", { name: /Dev Harper/ }))

    const clear = await screen.findByRole("button", { name: "Choose another user as you in checkout-web" })

    expect(searchAuthors).toHaveBeenCalledWith({ repositoryName: "checkout-web", role: "self", query: "dev" })
    expect(setSelfAuthor).toHaveBeenCalledWith({ repositoryName: "checkout-web", authorId: "dev@acme.example" })
    expect(screen.getByText("You")).toBeTruthy()
    expect(screen.queryByRole("combobox", { name: "Which user are you in checkout-web?" })).toBeNull()
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save and continue" }).disabled).toBe(false)

    fireEvent.click(clear)

    await waitFor(() => {
      expect(setSelfAuthor).toHaveBeenLastCalledWith({ repositoryName: "checkout-web", authorId: null })
    })
  })

  it("shows the user git config names in a local git repository, without asking or letting them change it", async () => {
    const fromGitConfig = {
      ...checkoutWeb,
      selfAuthor: { hint: SELF_HINT, author: dev, stateLabel: null, isChangeable: false },
    }
    renderApp({
      "setup.get": () => pageOf({ ...selfChosenRepositoriesForm, repositories: [fromGitConfig] }),
      "setup.searchFolders": () => noFolders,
    })

    expect(await screen.findByText("Dev Harper")).toBeTruthy()
    expect(screen.queryByRole("combobox", { name: "Which user are you in checkout-web?" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Choose another user as you in checkout-web" })).toBeNull()
  })

  it("searches the users of a repository and tracks the chosen one", async () => {
    const searchAuthors = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({
      data: { options: [{ ...lena, isTaken: false, stateLabel: null }], message: null },
    })
    const getSetup = vi
      .fn<() => ProcedureReply>()
      .mockReturnValueOnce(pageOf(selfChosenRepositoriesForm))
      .mockReturnValue(pageOf(readyRepositoriesForm))
    const setAuthorTracking = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { authorId: lena.id } })
    renderApp({
      "setup.get": getSetup,
      "setup.searchFolders": () => noFolders,
      "setup.searchAuthors": searchAuthors,
      "setup.setAuthorTracking": setAuthorTracking,
    })

    const field = await screen.findByRole("combobox", { name: "Track specific team members in checkout-web" })
    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: "len" } })
    fireEvent.click(await screen.findByRole("option", { name: /Lena Okafor/ }))

    const tracked = await screen.findByRole("list", { name: "Tracked team members of checkout-web" })

    expect(await within(tracked).findByText("Lena Okafor")).toBeTruthy()
    expect(searchAuthors).toHaveBeenCalledWith({ repositoryName: "checkout-web", role: "tracked", query: "len" })
    expect(setAuthorTracking).toHaveBeenCalledWith({
      repositoryName: "checkout-web",
      authorId: "lena@acme.example",
      isTracked: true,
    })
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Save and continue" }).disabled).toBe(false)
  })

  it("stops tracking a user and removes a repository", async () => {
    const setAuthorTracking = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { authorId: lena.id } })
    const removeRepository = vi.fn<(input: unknown) => ProcedureReply>().mockReturnValue({ data: { name: "checkout-web" } })
    renderApp({
      "setup.get": () => pageOf(readyRepositoriesForm),
      "setup.searchFolders": () => noFolders,
      "setup.setAuthorTracking": setAuthorTracking,
      "setup.removeRepository": removeRepository,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Stop tracking Lena Okafor" }))
    fireEvent.click(screen.getByRole("checkbox", { name: /^checkout-web/ }))

    await waitFor(() => {
      expect(removeRepository).toHaveBeenCalledWith({ name: "checkout-web" })
    })
    expect(setAuthorTracking).toHaveBeenCalledWith({
      repositoryName: "checkout-web",
      authorId: "lena@acme.example",
      isTracked: false,
    })
  })

  it("saves the repositories step and opens the git integration", async () => {
    const getSetup = vi.fn<() => ProcedureReply>().mockReturnValueOnce(pageOf(readyRepositoriesForm)).mockReturnValue(forgesPage)
    const saveStep = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "accepted", nextStep: "forges" } })
    renderApp({ "setup.get": getSetup, "setup.searchFolders": () => noFolders, "setup.saveStep": saveStep })

    fireEvent.click(await screen.findByRole("button", { name: "Save and continue" }))

    expect(await screen.findByRole("heading", { name: "Git integration" })).toBeTruthy()
    expect(saveStep).toHaveBeenCalledWith({ step: "repositories" })
  })

  it("finishes the setup on the review configuration step and opens the repositories", async () => {
    const saveStep = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "accepted", nextStep: "configuration" } })
    const completeSetup = vi.fn<() => ProcedureReply>().mockReturnValue({ data: { redirectTo: "/" } })
    const gate = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValueOnce({ data: { redirectTo: null } })
      .mockReturnValue({ data: { redirectTo: null } })
    renderApp({
      "setup.gate": gate,
      "setup.get": () => configurationPage,
      "setup.saveStep": saveStep,
      "setup.complete": completeSetup,
      "repository.list": () => ({ data: { kind: "empty", notice: null, fixtures: null } }),
    })

    fireEvent.click(await screen.findByRole("button", { name: "Finish setup" }))

    expect(await screen.findByRole("heading", { name: "Repositories" })).toBeTruthy()
    expect(saveStep).toHaveBeenCalledWith({ step: "configuration", configurationId: "standard" })
    expect(completeSetup).toHaveBeenCalledTimes(1)
    expect(gate).toHaveBeenLastCalledWith({ path: "/" })
  })

  it("keeps the review configuration step open with the reason when the setup cannot be finished", async () => {
    const completeSetup = vi.fn<() => ProcedureReply>().mockReturnValue({ errorMessage: "Add at least one repository." })
    renderApp({
      "setup.get": () => configurationPage,
      "setup.saveStep": () => ({ data: { kind: "accepted", nextStep: "configuration" } }),
      "setup.complete": completeSetup,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Finish setup" }))

    expect((await screen.findByRole("alert")).textContent).toBe("Add at least one repository.")
  })

  it("does not finish the setup when the review configuration is refused", async () => {
    const completeSetup = vi.fn<() => ProcedureReply>()
    renderApp({
      "setup.get": () => configurationPage,
      "setup.saveStep": () => ({
        data: { kind: "rejected", message: "This configuration no longer exists. Pick another one.", field: null },
      }),
      "setup.complete": completeSetup,
    })

    fireEvent.click(await screen.findByRole("button", { name: "Finish setup" }))

    expect((await screen.findByRole("alert")).textContent).toBe("This configuration no longer exists. Pick another one.")
    expect(completeSetup).not.toHaveBeenCalled()
  })

  it("reports that the setup could not be loaded and offers to try again", async () => {
    renderApp({ "setup.get": () => ({ errorMessage: "The data directory cannot be read." }) })

    const alert = await screen.findByRole("alert")

    expect(within(alert).getByRole("heading", { name: "Could not load the setup" })).toBeTruthy()
    expect(within(alert).getByText("The data directory cannot be read.")).toBeTruthy()
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeTruthy()
  })
})

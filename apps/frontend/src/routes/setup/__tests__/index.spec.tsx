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
  connection: "direct",
  connectionOptions: [
    {
      connection: "direct",
      label: "Flight Plan talks to the agent",
      tagLabel: "Recommended",
      description: "It does not use the agent's SDK, so it adds no billing on top of your normal use.",
      unavailableFeatures: [],
    },
    {
      connection: "manual",
      label: "You prompt the agent yourself",
      tagLabel: null,
      description: "Flight Plan gives you each prompt.",
      unavailableFeatures: ["Chatting with the agent from a review", "Applying a fix from a finding"],
    },
  ],
}

const forgesForm = {
  step: "forges",
  forges: [
    {
      forge: "git",
      label: "Local git",
      description: "Reviews the branches of a repository on this machine.",
      isPicked: true,
      isRequired: true,
      availability: { kind: "available", statusLabel: null },
      fields: [],
      limitation: { label: "With local git only, Flight Plan cannot:", items: ["List pull requests to review"] },
    },
    {
      forge: "gh",
      label: "GitHub CLI",
      description: "Reaches GitHub through the GitHub command line tool.",
      isPicked: false,
      isRequired: false,
      availability: { kind: "available", statusLabel: "Signed in as dev-harper" },
      fields: [],
      limitation: null,
    },
    {
      forge: "glab",
      label: "GitLab CLI",
      description: "Reaches GitLab through the GitLab command line tool.",
      isPicked: false,
      isRequired: false,
      availability: { kind: "unavailable", reason: "glab is not installed on this machine." },
      fields: [],
      limitation: null,
    },
    {
      forge: "github",
      label: "GitHub token",
      description: "Reaches GitHub with a token.",
      isPicked: false,
      isRequired: false,
      availability: { kind: "available", statusLabel: null },
      fields: [
        { name: "token", label: "Token", hint: "Kept on this machine.", placeholder: "", value: "", isSecret: true },
        { name: "baseUrl", label: "Base URL", hint: "Only for a self-hosted forge.", placeholder: "", value: "", isSecret: false },
      ],
      limitation: null,
    },
  ],
  defaultForge: "git",
}

const configurationForm = {
  step: "configuration",
  presets: [
    { preset: "standard", label: "Standard", bestFor: "Best for general pull requests.", description: "The full review.", note: null },
    {
      preset: "minimal",
      label: "Minimal (caveman)",
      bestFor: "Best for saving tokens.",
      description: "Caveman style.",
      note: "Diagrams are off by default.",
    },
  ],
  selectedPreset: "standard",
}

const dev = { id: "dev@acme.example", name: "Dev Harper", detail: "dev@acme.example", avatarUrl: null, monogram: "DH" }

const SELF_HINT = "Git cannot tell who you are here. Search for the name or email you commit with, then pick yourself."

const lena = { id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", avatarUrl: null, monogram: "LO" }

const checkoutWeb = {
  name: "checkout-web",
  path: "/Users/dev/projects/checkout-web",
  lineColor: "blue",
  lineLabel: "C",
  authorSearchHint: "Search by name or email. The people who committed most recently come first.",
  authorSearchPlaceholder: "Type a name or email",
  selfAuthor: { hint: SELF_HINT, author: null, stateLabel: "Not chosen" },
  trackedAuthors: [],
  missingAuthorMessage: null,
}

const checkoutWebWithSelf = { ...checkoutWeb, selfAuthor: { hint: SELF_HINT, author: dev, stateLabel: "You" } }

const emptyRepositoriesForm = {
  step: "repositories",
  repositories: [],
  isReadyToFinish: false,
  finishHint: "Add at least one repository.",
}

const untrackedRepositoriesForm = {
  step: "repositories",
  repositories: [checkoutWeb],
  isReadyToFinish: false,
  finishHint: "Pick which user you are in checkout-web.",
}

const selfChosenRepositoriesForm = {
  step: "repositories",
  repositories: [checkoutWebWithSelf],
  isReadyToFinish: true,
  finishHint: null,
}

const readyRepositoriesForm = {
  step: "repositories",
  repositories: [{ ...checkoutWebWithSelf, trackedAuthors: [lena] }],
  isReadyToFinish: true,
  finishHint: null,
}

const FIRST_STEP_ROUTE = [
  stopOf("agents", "Agents", "current", true, "The coding agents that write your reviews"),
  stopOf("forges", "Git forge", "upcoming", false, "Where your pull requests are hosted"),
  stopOf("configuration", "Configuration", "upcoming", false, "How the agent writes a review"),
  stopOf("repositories", "Repositories", "upcoming", false, "The repositories and users to follow"),
]

const SECOND_STEP_ROUTE = [
  stopOf("agents", "Agents", "saved", true, "Claude"),
  stopOf("forges", "Git forge", "current", true, "Where your pull requests are hosted"),
  stopOf("configuration", "Configuration", "upcoming", false, "How the agent writes a review"),
  stopOf("repositories", "Repositories", "upcoming", false, "The repositories and users to follow"),
]

const pageOf = (form: unknown, overrides: Record<string, unknown> = {}): ProcedureReply => ({
  data: { progressLabel: "Step 1 of 4", route: FIRST_STEP_ROUTE, backStep: null, form, ...overrides },
})

const forgesPage = pageOf(forgesForm, { progressLabel: "Step 2 of 4", route: SECOND_STEP_ROUTE, backStep: "agents" })

const noFolders: ProcedureReply = { data: { options: [], message: null } }

const localGitAuthorForm: ProcedureReply = {
  data: {
    selfAuthorHint: SELF_HINT,
    searchHint: "Search by name or email.",
    searchPlaceholder: "Type a name or email",
  },
}

const forgeAuthorForm: ProcedureReply = {
  data: { selfAuthorHint: null, searchHint: "Search by name or username.", searchPlaceholder: "Type a name or username" },
}

const incompleteSetupGate = (input: unknown): ProcedureReply => ({
  data: { redirectTo: JSON.stringify(input).includes("/setup") ? null : "/setup" },
})

const renderApp = (handlers: ProcedureHandlers, path = "/setup") =>
  render(
    createApp({
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      trpcClient: createTrpcClient(fakeBackendLinks({ "setup.gate": incompleteSetupGate, ...handlers })),
      history: createMemoryHistory({ initialEntries: [path] }),
    }),
  )

describe("the setup page", () => {
  it("is where every page leads until the setup is complete", async () => {
    renderApp({ "setup.get": () => pageOf(agentsForm) }, "/")

    expect(await screen.findByRole("heading", { name: "Choose your agents" })).toBeTruthy()
  })

  it("draws the four steps as stops and says which step is open", async () => {
    renderApp({ "setup.get": () => pageOf(agentsForm) })

    const steps = await screen.findByRole("navigation", { name: "Setup steps" })

    expect(within(steps).getAllByRole("listitem").map((stop) => stop.textContent)).toStrictEqual([
      "Agents, currentThe coding agents that write your reviews",
      "Git forge, upcomingWhere your pull requests are hosted",
      "Configuration, upcomingHow the agent writes a review",
      "Repositories, upcomingThe repositories and users to follow",
    ])
    expect(within(steps).getByText("Agents").getAttribute("aria-current")).toBe("step")
    expect(within(steps).queryByRole("link")).toBeNull()
    expect(screen.getByRole("heading", { level: 1, name: "Welcome to Flight Plan" })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 2, name: "Choose your agents" })).toBeTruthy()
  })

  it("links back to a saved step and to no step that is not reached", async () => {
    renderApp({ "setup.get": () => forgesPage })

    const steps = await screen.findByRole("navigation", { name: "Setup steps" })

    expect(within(steps).getByRole("link", { name: "Agents" }).getAttribute("href")).toBe("/setup?step=agents")
    expect(within(steps).getAllByRole("link")).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Back" }).getAttribute("href")).toBe("/setup?step=agents")
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

  it("tells that talking to the agent directly adds no billing and what manual prompting gives up", async () => {
    renderApp({ "setup.get": () => pageOf(agentsForm) })

    expect(await screen.findByText(/It does not use the agent's SDK/)).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>("radio", { name: /Flight Plan talks to the agent/ }).checked).toBe(true)
    expect(screen.getByText("Chatting with the agent from a review")).toBeTruthy()
    expect(screen.getByText("Applying a fix from a finding")).toBeTruthy()
  })

  it("saves the agents and opens the next step", async () => {
    const getSetup = vi.fn<() => ProcedureReply>().mockReturnValueOnce(pageOf(agentsForm)).mockReturnValue(forgesPage)
    const saveStep = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "accepted", nextStep: "forges" } })
    renderApp({ "setup.get": getSetup, "setup.saveStep": saveStep })

    fireEvent.click(await screen.findByRole("checkbox", { name: "Claude" }))
    fireEvent.click(screen.getByRole("radio", { name: /You prompt the agent yourself/ }))
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }))

    expect(await screen.findByRole("heading", { name: "Connect your git forge" })).toBeTruthy()
    expect(saveStep).toHaveBeenCalledWith({
      step: "agents",
      agents: [
        { agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", model: "default", effort: "default" },
        { agent: "codex", isPicked: false, installPath: "/Users/dev/.codex", model: "default", effort: "default" },
        { agent: "cursor", isPicked: false, installPath: "", model: "default", effort: "default" },
      ],
      defaultAgent: null,
      connection: "manual",
    })
  })

  it("offers the models of a picked agent and saves the one chosen", async () => {
    const saveStep = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "accepted", nextStep: "forges" } })
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
      .mockReturnValue({ data: { kind: "accepted", nextStep: "forges" } })
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
    expect(screen.getByRole("heading", { name: "Choose your agents" })).toBeTruthy()
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

  it("shows a forge that cannot be used as unavailable, with the reason", async () => {
    renderApp({ "setup.get": () => forgesPage })

    const gitlabCli = await screen.findByRole<HTMLInputElement>("checkbox", { name: /GitLab CLI/ })

    expect(gitlabCli.disabled).toBe(true)
    expect(screen.getByText(/glab is not installed on this machine\./).classList.contains("text-destructive")).toBe(true)
    expect(screen.getByText("Signed in as dev-harper")).toBeTruthy()
  })

  it("keeps local git picked, locked and the default, and lists what it cannot do", async () => {
    renderApp({ "setup.get": () => forgesPage })

    const localGit = await screen.findByRole<HTMLInputElement>("checkbox", { name: /Local git/ })

    expect(localGit.checked).toBe(true)
    expect(localGit.disabled).toBe(true)
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Default forge: Local git" }).checked).toBe(true)
    expect(screen.getByText("With local git only, Flight Plan cannot:")).toBeTruthy()
    expect(screen.getByText("List pull requests to review")).toBeTruthy()
  })

  it("makes a forge the default when it is checked, and returns to local git when it is unchecked", async () => {
    renderApp({ "setup.get": () => forgesPage })

    const githubToken = await screen.findByRole("checkbox", { name: /GitHub token/ })
    const defaultRadioOf = (label: string) => screen.getByRole<HTMLInputElement>("radio", { name: `Default forge: ${label}` })

    fireEvent.click(githubToken)

    expect(defaultRadioOf("GitHub token").checked).toBe(true)
    expect(defaultRadioOf("Local git").checked).toBe(false)

    fireEvent.click(githubToken)

    expect(defaultRadioOf("Local git").checked).toBe(true)
  })

  it("asks a token forge for its token in a hidden field and sends it with the step", async () => {
    const saveStep = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "accepted", nextStep: "configuration" } })
    renderApp({ "setup.get": () => forgesPage, "setup.saveStep": saveStep })

    fireEvent.click(await screen.findByRole("checkbox", { name: /GitHub token/ }))
    const token = screen.getByLabelText<HTMLInputElement>("Token for GitHub token")
    fireEvent.change(token, { target: { value: "secret" } })
    fireEvent.click(screen.getByRole("radio", { name: "Default forge: GitHub token" }))
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }))

    await waitFor(() => {
      expect(saveStep).toHaveBeenCalledTimes(1)
    })
    expect(token.type).toBe("password")
    expect(saveStep).toHaveBeenCalledWith({
      step: "forges",
      forges: [
        { forge: "git", isPicked: true, username: "", token: "", baseUrl: "" },
        { forge: "gh", isPicked: false, username: "", token: "", baseUrl: "" },
        { forge: "glab", isPicked: false, username: "", token: "", baseUrl: "" },
        { forge: "github", isPicked: true, username: "", token: "secret", baseUrl: "" },
      ],
      defaultForge: "github",
    })
  })

  it("explains what a configuration is and saves the chosen one", async () => {
    const saveStep = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValue({ data: { kind: "accepted", nextStep: "repositories" } })
    renderApp({ "setup.get": () => pageOf(configurationForm), "setup.saveStep": saveStep })

    expect(await screen.findByText(/A configuration decides how the agent writes a review/)).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>("radio", { name: /Standard/ }).checked).toBe(true)
    expect(screen.getByText("You can pick another configuration each time you create a Flight Plan.")).toBeTruthy()
    expect(screen.getByText("You can create your own configurations later, in the settings.")).toBeTruthy()

    fireEvent.click(screen.getByRole("radio", { name: /Minimal/ }))
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }))

    await waitFor(() => {
      expect(saveStep).toHaveBeenCalledWith({ step: "configuration", preset: "minimal" })
    })
  })

  it("holds the finish and says what is missing", async () => {
    renderApp({ "setup.get": () => pageOf(emptyRepositoriesForm), "setup.searchFolders": () => noFolders })

    const finish = await screen.findByRole<HTMLButtonElement>("button", { name: "Finish setup" })

    expect(finish.disabled).toBe(true)
    expect(screen.getByText("Add at least one repository.")).toBeTruthy()
    expect(screen.getByText("No repositories yet. Add one to start.")).toBeTruthy()
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

    expect(await screen.findByRole("region", { name: "checkout-web" })).toBeTruthy()
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

    expect(await screen.findByRole("combobox", { name: "Track a user" })).toBeTruthy()
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
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Finish setup" }).disabled).toBe(false)

    fireEvent.click(clear)

    await waitFor(() => {
      expect(setSelfAuthor).toHaveBeenLastCalledWith({ repositoryName: "checkout-web", authorId: null })
    })
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

    const field = await screen.findByRole("combobox", { name: "Track a user in checkout-web" })
    fireEvent.focus(field)
    fireEvent.change(field, { target: { value: "len" } })
    fireEvent.click(await screen.findByRole("option", { name: /Lena Okafor/ }))

    const tracked = await screen.findByRole("list", { name: "Tracked users of checkout-web" })

    expect(await within(tracked).findByText("Lena Okafor")).toBeTruthy()
    expect(searchAuthors).toHaveBeenCalledWith({ repositoryName: "checkout-web", role: "tracked", query: "len" })
    expect(setAuthorTracking).toHaveBeenCalledWith({
      repositoryName: "checkout-web",
      authorId: "lena@acme.example",
      isTracked: true,
    })
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Finish setup" }).disabled).toBe(false)
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
    fireEvent.click(screen.getByRole("button", { name: "Remove checkout-web" }))

    await waitFor(() => {
      expect(removeRepository).toHaveBeenCalledWith({ name: "checkout-web" })
    })
    expect(setAuthorTracking).toHaveBeenCalledWith({
      repositoryName: "checkout-web",
      authorId: "lena@acme.example",
      isTracked: false,
    })
  })

  it("finishes the setup and opens the repositories", async () => {
    const completeSetup = vi.fn<() => ProcedureReply>().mockReturnValue({ data: { redirectTo: "/" } })
    const gate = vi
      .fn<(input: unknown) => ProcedureReply>()
      .mockReturnValueOnce({ data: { redirectTo: null } })
      .mockReturnValue({ data: { redirectTo: null } })
    renderApp({
      "setup.gate": gate,
      "setup.get": () => pageOf(readyRepositoriesForm),
      "setup.searchFolders": () => noFolders,
      "setup.complete": completeSetup,
      "repository.list": () => ({ data: { kind: "empty", notice: null } }),
    })

    fireEvent.click(await screen.findByRole("button", { name: "Finish setup" }))

    expect(await screen.findByRole("heading", { name: "Repositories" })).toBeTruthy()
    expect(completeSetup).toHaveBeenCalledTimes(1)
    expect(gate).toHaveBeenLastCalledWith({ path: "/" })
  })

  it("reports that the setup could not be loaded and offers to try again", async () => {
    renderApp({ "setup.get": () => ({ errorMessage: "The data directory cannot be read." }) })

    const alert = await screen.findByRole("alert")

    expect(within(alert).getByRole("heading", { name: "Could not load the setup" })).toBeTruthy()
    expect(within(alert).getByText("The data directory cannot be read.")).toBeTruthy()
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeTruthy()
  })
})

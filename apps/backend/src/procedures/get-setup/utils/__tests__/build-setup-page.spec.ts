import { DEFAULT_REVIEW_PREFERENCES } from "@/procedures/get-review-preferences/utils/review-preferences"
import { buildSetupPage, type SetupPageSource } from "@/procedures/get-setup/utils/build-setup-page"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import {
  AT_CONFIGURATION,
  AT_FORGES,
  AT_REPOSITORIES,
  CHECKOUT_WEB,
  GITHUB_FORGES,
  READY_TO_FINISH,
  SAVED_AGENTS,
} from "./setup-fixture"

const sourceOf = (overrides: Partial<SetupPageSource>): SetupPageSource => ({
  setup: EMPTY_SETUP,
  step: "agents",
  agentDetections: [],
  agentModels: {},
  cliProbes: [],
  repositoryForges: {},
  repositoryIdentities: {},
  ...overrides,
})

const ALL_WITH_CLI = [
  { agent: "claude", installPath: "/Users/dev/.claude", hasCli: true },
  { agent: "codex", installPath: "/Users/dev/.codex", hasCli: true },
  { agent: "cursor", installPath: null, hasCli: true },
] as const

const CLAUDE_MODELS = {
  claude: [
    { model: "default", label: "Default (recommended)", efforts: ["low", "high"] },
    { model: "opus", label: "Opus 5.5", efforts: ["low", "high"] },
    { model: "sonnet", label: "Sonnet 5.5", efforts: ["low", "high"] },
  ],
} as const

describe("buildSetupPage", () => {
  it("says which step of four is open and where Back leads", () => {
    const page = buildSetupPage(sourceOf({ setup: AT_FORGES, step: "forges" }))

    expect(page.progressLabel).toBe("Step 2 of 4")
    expect(page.backStep).toBe("repositories")
    expect(buildSetupPage(sourceOf({ step: "repositories" })).backStep).toBeNull()
  })

  it("draws every step as a stop that says what it is for until it is saved", () => {
    const { route } = buildSetupPage(sourceOf({ step: "repositories" }))

    expect(route.map((stop) => [stop.label, stop.state, stop.isReachable])).toStrictEqual([
      ["Repositories", "current", true],
      ["Git integration", "upcoming", false],
      ["Agent integration", "upcoming", false],
      ["Review configuration", "upcoming", false],
    ])
    expect(route[1]?.lines).toStrictEqual([[{ text: "Configure how Flight Plan communicates with your git setup", kind: "plain" }]])
    expect(route[3]?.lines).toStrictEqual([[{ text: "Configure how Flight Plan puts your reviews together", kind: "plain" }]])
  })

  it("writes what was saved beside each saved stop and marks the default among several", () => {
    const { route } = buildSetupPage(sourceOf({ setup: READY_TO_FINISH, step: "configuration" }))

    expect(route.map((stop) => stop.state)).toStrictEqual(["saved", "saved", "saved", "current"])
    expect(route[0]?.lines).toStrictEqual([[{ text: "checkout-web", kind: "plain" }]])
    expect(route[1]?.lines).toStrictEqual([[{ text: "Local git", kind: "plain" }]])
    expect(route[2]?.lines).toStrictEqual([
      [{ text: "Claude", kind: "plain" }, { text: "Codex (default)", kind: "plain" }],
    ])
    expect(route[3]?.lines).toStrictEqual([[{ text: "Minimal", kind: "plain" }]])
  })

  it("prefills each agent's folder from what was detected and explains a missing one", () => {
    const { form } = buildSetupPage(
      sourceOf({
        agentDetections: [
          { agent: "claude", installPath: "/Users/dev/.claude", hasCli: true },
          { agent: "codex", installPath: null, hasCli: true },
          { agent: "cursor", installPath: null, hasCli: true },
        ],
      }),
    )

    expect(form).toMatchObject({
      step: "agents",
      defaultAgent: null,
      agents: [
        { agent: "claude", isPicked: false, installPath: "/Users/dev/.claude", unavailableReason: null },
        { agent: "codex", isPicked: false, installPath: "" },
        {
          agent: "cursor",
          isPicked: false,
          installPath: "",
          pathHint: "Cursor was not found on this machine. Enter the folder it keeps its configuration in.",
        },
      ],
    })
  })

  it("shows the saved agents, default and connection when the step is opened again", () => {
    const { form } = buildSetupPage(sourceOf({ setup: AT_CONFIGURATION, step: "agents", agentDetections: ALL_WITH_CLI }))

    expect(form).toMatchObject({
      defaultAgent: "codex",
      agents: [{ agent: "claude", isPicked: true }, { agent: "codex", isPicked: true }, { agent: "cursor", isPicked: false }],
    })
  })

  it("offers each agent the models it lists and shows the saved one", () => {
    const setup = {
      ...AT_CONFIGURATION,
      agents: { ...SAVED_AGENTS, installs: [{ agent: "claude", installPath: "/Users/dev/.claude", model: "sonnet", effort: "default" }] },
    } as const
    const { form } = buildSetupPage(
      sourceOf({ setup, step: "agents", agentDetections: ALL_WITH_CLI, agentModels: CLAUDE_MODELS }),
    )

    expect(form).toMatchObject({
      agents: [
        {
          agent: "claude",
          model: "sonnet",
          modelOptions: [
            { model: "default", label: "Default (recommended)" },
            { model: "opus", label: "Opus 5.5" },
            { model: "sonnet", label: "Sonnet 5.5" },
          ],
        },
        { agent: "codex", model: "default", modelOptions: [{ model: "default", label: "Your Codex default" }] },
        { agent: "cursor", model: "default" },
      ],
    })
  })

  it("offers each model its efforts and shows the saved effort", () => {
    const setup = {
      ...AT_CONFIGURATION,
      agents: {
        ...SAVED_AGENTS,
        installs: [{ agent: "claude", installPath: "/Users/dev/.claude", model: "sonnet", effort: "high" }],
      },
    } as const
    const { form } = buildSetupPage(
      sourceOf({ setup, step: "agents", agentDetections: ALL_WITH_CLI, agentModels: CLAUDE_MODELS }),
    )

    expect(form).toMatchObject({
      agents: [
        {
          agent: "claude",
          effort: "high",
          modelOptions: [
            {},
            {},
            {
              model: "sonnet",
              hasEffortChoice: true,
              selectedEffort: "high",
              effortOptions: [
                { effort: "default", label: "Default" },
                { effort: "low", label: "Low" },
                { effort: "high", label: "High" },
              ],
            },
          ],
        },
        { agent: "codex", effort: "default", modelOptions: [{ hasEffortChoice: false, selectedEffort: "default" }] },
        {},
      ],
    })
  })

  it("names a chosen effort after its agent and model in the saved summary", () => {
    const setup = {
      ...READY_TO_FINISH,
      agents: {
        ...SAVED_AGENTS,
        installs: [{ agent: "claude", installPath: "/Users/dev/.claude", model: "opus", effort: "high" }],
        defaultAgent: "claude",
      },
    } as const
    const { route } = buildSetupPage(sourceOf({ setup, step: "configuration", agentModels: CLAUDE_MODELS }))

    expect(route[2]?.lines[0]).toStrictEqual([{ text: "Claude, Opus 5.5, High effort", kind: "plain" }])
  })

  it("offers the agent's default and the saved model when the agent lists no models", () => {
    const setup = {
      ...AT_CONFIGURATION,
      agents: { ...SAVED_AGENTS, installs: [{ agent: "claude", installPath: "/Users/dev/.claude", model: "sonnet", effort: "default" }] },
    } as const
    const { form } = buildSetupPage(sourceOf({ setup, step: "agents", agentDetections: ALL_WITH_CLI }))

    expect(form).toMatchObject({
      agents: [
        {
          agent: "claude",
          model: "sonnet",
          modelOptions: [{ model: "default", label: "Your Claude default" }, { model: "sonnet", label: "sonnet" }],
        },
        {},
        {},
      ],
    })
  })

  it("names a chosen model beside its agent in the saved summary", () => {
    const setup = {
      ...READY_TO_FINISH,
      agents: { ...SAVED_AGENTS, installs: [{ agent: "claude", installPath: "/Users/dev/.claude", model: "opus", effort: "default" }], defaultAgent: "claude" },
    } as const
    const { route } = buildSetupPage(sourceOf({ setup, step: "configuration", agentModels: CLAUDE_MODELS }))

    expect(route[2]?.lines[0]).toStrictEqual([{ text: "Claude, Opus 5.5", kind: "plain" }])
  })

  it("does not offer an agent whose command line program is not installed, and says why", () => {
    const { form } = buildSetupPage(
      sourceOf({
        agentDetections: [
          { agent: "claude", installPath: "/Users/dev/.claude", hasCli: true },
          { agent: "codex", installPath: "/Users/dev/.codex", hasCli: false },
        ],
      }),
    )

    expect(form).toMatchObject({
      agents: [
        { agent: "claude", unavailableReason: null },
        { agent: "codex", isPicked: false, unavailableReason: "codex is not installed on this machine." },
        { agent: "cursor", isPicked: false, unavailableReason: "cursor-agent is not installed on this machine." },
      ],
    })
  })

  it("drops a saved agent, and a saved default, whose command line program is gone", () => {
    const agentDetections = [
      { agent: "claude", installPath: "/Users/dev/.claude", hasCli: true },
      { agent: "codex", installPath: "/Users/dev/.codex", hasCli: false },
    ] as const

    const { form } = buildSetupPage(sourceOf({ setup: AT_CONFIGURATION, step: "agents", agentDetections }))

    expect(form).toMatchObject({
      defaultAgent: null,
      agents: [{ agent: "claude", isPicked: true }, { agent: "codex", isPicked: false }, { agent: "cursor", isPicked: false }],
    })
  })

  it("asks no way of talking to the agent, since Flight Plan always starts it itself", () => {
    const { form } = buildSetupPage(sourceOf({}))

    expect(form).not.toHaveProperty("connection")
    expect(form).not.toHaveProperty("connectionOptions")
  })

  it("offers every code host and marks a command line tool that cannot be used", () => {
    const { form } = buildSetupPage(
      sourceOf({
        setup: AT_FORGES,
        step: "forges",
        cliProbes: [
          { cli: "gh", state: { kind: "signed-in", account: "dev-harper" } },
          { cli: "glab", state: { kind: "missing" } },
        ],
      }),
    )

    expect(form).toMatchObject({
      step: "forges",
      forges: [
        { forge: "gh", availability: { kind: "available", statusLabel: "Signed in as dev-harper" } },
        { forge: "glab", availability: { kind: "unavailable", reason: "glab is not installed on this machine." } },
        { forge: "github", fields: [{ name: "token", isSecret: true }, { name: "baseUrl" }] },
        { forge: "gitlab", fields: [{ name: "token" }, { name: "baseUrl" }] },
        { forge: "bitbucket", fields: [{ name: "username" }, { name: "token" }, { name: "baseUrl" }] },
      ],
    })
  })

  it("lists what a code host connection adds and every code host, none picked until one is saved", () => {
    const { form } = buildSetupPage(sourceOf({ setup: AT_FORGES, step: "forges" }))

    expect(form).toMatchObject({
      codeHostFeatures: {
        label: "Connecting a git forge also enables these features.",
        items: [
          "Fetching the open pull requests of you and your team members",
          "Reading the comments and reviews on a pull request",
          "Adding comments and submitting pull request reviews",
          "Most other features your git provider offers",
        ],
      },
      forges: [
        { forge: "gh", isPicked: false },
        { forge: "glab", isPicked: false },
        { forge: "github", isPicked: false },
        { forge: "gitlab", isPicked: false },
        { forge: "bitbucket", isPicked: false },
      ],
    })
    expect(form).not.toHaveProperty("defaultForge")
  })

  it("never sends a saved token back and says that one is saved", () => {
    const { form } = buildSetupPage(sourceOf({ setup: { ...AT_FORGES, forges: GITHUB_FORGES }, step: "forges" }))

    expect(form).toMatchObject({
      forges: [
        { forge: "gh", isPicked: true },
        { forge: "glab" },
        {
          forge: "github",
          isPicked: true,
          fields: [
            { name: "token", value: "", hint: "A token is saved. Leave this empty to keep it." },
            { name: "baseUrl", value: "https://github.acme.example" },
          ],
        },
        { forge: "gitlab", isPicked: false },
        { forge: "bitbucket", isPicked: false },
      ],
    })
  })

  it("selects Standard until a configuration is saved", () => {
    expect(buildSetupPage(sourceOf({ setup: AT_CONFIGURATION, step: "configuration" })).form).toMatchObject({
      selectedConfigurationId: "standard",
      presets: [
        { configurationId: "standard" },
        { configurationId: "minimal" },
        { configurationId: "onboardee" },
        { configurationId: "unfamiliar-territory" },
      ],
    })
    expect(buildSetupPage(sourceOf({ setup: AT_REPOSITORIES, step: "configuration" })).form).toMatchObject({
      selectedConfigurationId: "minimal",
    })
  })

  it("offers the review preferences with the defaults until they are saved, and every spotlight choice", () => {
    const savedSetup = { ...AT_CONFIGURATION, reviewPreferences: { ...DEFAULT_REVIEW_PREFERENCES, spotlight: ["security"] as const } }
    const form = buildSetupPage(sourceOf({ setup: AT_CONFIGURATION, step: "configuration" })).form

    expect(form).toMatchObject({ preferences: { spotlight: ["page", "component", "api-route", "database-read-write", "data-model", "hook"], isSegmented: true } })
    expect(form).toHaveProperty("spotlightGroups.length", 5)
    expect(form).toHaveProperty("spotlightGroups.1.choices.0", { classification: "page", label: "Page", description: "Code that renders on a visit to a path", isFeatured: true })
    expect(buildSetupPage(sourceOf({ setup: savedSetup, step: "configuration" })).form).toMatchObject({
      preferences: { spotlight: ["security"] },
    })
  })

  it("lets a local git user continue with nobody picked, and shows no user when git config has no email", () => {
    const setup = { ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB] }

    expect(buildSetupPage(sourceOf({ setup, step: "repositories" })).form).toMatchObject({
      isReadyToContinue: true,
      continueHint: null,
      repositories: [{ selfAuthor: null }],
    })
  })

  it("holds the repositories step until a repository is added", () => {
    const empty = buildSetupPage(sourceOf({ setup: EMPTY_SETUP, step: "repositories" })).form
    const ready = buildSetupPage(sourceOf({ setup: READY_TO_FINISH, step: "repositories" })).form

    expect(empty).toMatchObject({ isReadyToContinue: false, continueHint: "Add at least one repository." })
    expect(ready).toMatchObject({
      isReadyToContinue: true,
      continueHint: null,
      repositories: [
        {
          name: "checkout-web",
          lineColor: "blue",
          lineLabel: "C",
          trackedAuthors: [{ name: "Lena Okafor", monogram: "LO" }],
        },
      ],
    })
  })

  it("lets a forge user continue with nobody tracked, since Flight Plan then follows everyone", () => {
    const setup = { ...READY_TO_FINISH, forges: GITHUB_FORGES, repositories: [CHECKOUT_WEB] }
    const repositoryForges = { [CHECKOUT_WEB.path]: "gh" } as const

    expect(buildSetupPage(sourceOf({ setup, step: "repositories", repositoryForges })).form).toMatchObject({
      isReadyToContinue: true,
      continueHint: null,
      repositories: [{ trackedAuthors: [] }],
    })
  })

  it("shows a local git user only the user git config names, and a forge user nobody", () => {
    const localGit = buildSetupPage(sourceOf({ setup: READY_TO_FINISH, step: "repositories" })).form
    const github = buildSetupPage(
      sourceOf({
        setup: { ...READY_TO_FINISH, forges: GITHUB_FORGES },
        step: "repositories",
        repositoryForges: { [CHECKOUT_WEB.path]: "gh" },
      }),
    ).form

    expect(localGit).toMatchObject({
      repositories: [
        {
          authorSearchHint: "By default, Flight Plan lists only the branches you add. Add your teammates here to see their branches and yours too.",
          authorSearchPlaceholder: "Type a name or email",
          selfAuthor: null,
        },
      ],
    })
    expect(github).toMatchObject({
      repositories: [
        {
          authorSearchHint: "By default, Flight Plan shows everyone's pull requests in checkout-web. To see only your teammates' pull requests and yours, add them here.",
          authorSearchPlaceholder: "Type a name or username",
          selfAuthor: null,
        },
      ],
    })
  })

  it("shows the user git config names in a local git repository", () => {
    const setup = { ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB] }
    const repositoryIdentities = { [CHECKOUT_WEB.path]: { name: "Lena Okafor", email: "lena@acme.example" } }

    expect(buildSetupPage(sourceOf({ setup, step: "repositories", repositoryIdentities })).form).toMatchObject({
      repositories: [
        {
          selfAuthor: { id: "lena@acme.example", name: "Lena Okafor", detail: "lena@acme.example", monogram: "LO" },
        },
      ],
      isReadyToContinue: true,
      continueHint: null,
    })
  })

  it("follows the forge that serves each repository, not only the default forge", () => {
    const forgeRepository = { ...CHECKOUT_WEB, name: "storefront", path: "/Users/dev/projects/storefront" }
    const setup = { ...READY_TO_FINISH, repositories: [...READY_TO_FINISH.repositories, forgeRepository] }
    const repositoryForges = { [CHECKOUT_WEB.path]: "git", [forgeRepository.path]: "gh" } as const
    const identity = { name: "Dev Harper", email: "dev@acme.example" }
    const repositoryIdentities = { [CHECKOUT_WEB.path]: identity, [forgeRepository.path]: identity }

    expect(buildSetupPage(sourceOf({ setup, step: "repositories", repositoryForges, repositoryIdentities })).form).toMatchObject({
      repositories: [
        { name: "checkout-web", selfAuthor: { name: "Dev Harper" }, authorSearchPlaceholder: "Type a name or email" },
        { name: "storefront", selfAuthor: null, authorSearchPlaceholder: "Type a name or username" },
      ],
      isReadyToContinue: true,
      continueHint: null,
    })
  })
})

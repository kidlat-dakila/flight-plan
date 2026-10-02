import { buildSetupPage, type SetupPageSource } from "@/procedures/get-setup/utils/build-setup-page"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import {
  AT_CONFIGURATION,
  AT_FORGES,
  AT_REPOSITORIES,
  CHECKOUT_WEB,
  GITHUB_FORGES,
  READY_TO_FINISH,
} from "./setup-fixture"

const sourceOf = (overrides: Partial<SetupPageSource>): SetupPageSource => ({
  setup: EMPTY_SETUP,
  step: "agents",
  agentDetections: [],
  cliProbes: [],
  ...overrides,
})

const ALL_WITH_CLI = [
  { agent: "claude", installPath: "/Users/dev/.claude", hasCli: true },
  { agent: "codex", installPath: "/Users/dev/.codex", hasCli: true },
  { agent: "cursor", installPath: null, hasCli: true },
] as const

describe("buildSetupPage", () => {
  it("says which step of four is open and where Back leads", () => {
    const page = buildSetupPage(sourceOf({ setup: AT_FORGES, step: "forges" }))

    expect(page.progressLabel).toBe("Step 2 of 4")
    expect(page.backStep).toBe("agents")
    expect(buildSetupPage(sourceOf({})).backStep).toBeNull()
  })

  it("draws every step as a stop that says what it is for until it is saved", () => {
    const { route } = buildSetupPage(sourceOf({}))

    expect(route.map((stop) => [stop.label, stop.state, stop.isReachable])).toStrictEqual([
      ["Agents", "current", true],
      ["Git forge", "upcoming", false],
      ["Configuration", "upcoming", false],
      ["Repositories", "upcoming", false],
    ])
    expect(route[1]?.lines).toStrictEqual([[{ text: "Where your pull requests are hosted", kind: "plain" }]])
  })

  it("writes what was saved beside each saved stop and marks the default among several", () => {
    const { route } = buildSetupPage(sourceOf({ setup: READY_TO_FINISH, step: "repositories" }))

    expect(route.map((stop) => stop.state)).toStrictEqual(["saved", "saved", "saved", "current"])
    expect(route[0]?.lines).toStrictEqual([
      [{ text: "Claude", kind: "plain" }, { text: "Codex (default)", kind: "plain" }],
      [{ text: "You prompt the agent yourself", kind: "plain" }],
    ])
    expect(route[1]?.lines).toStrictEqual([[{ text: "Local git", kind: "plain" }]])
    expect(route[2]?.lines).toStrictEqual([[{ text: "Minimal (caveman)", kind: "plain" }]])
    expect(route[3]?.lines).toStrictEqual([[{ text: "checkout-web", kind: "plain" }]])
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
      connection: "direct",
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
    const { form } = buildSetupPage(sourceOf({ setup: AT_FORGES, step: "agents", agentDetections: ALL_WITH_CLI }))

    expect(form).toMatchObject({
      defaultAgent: "codex",
      connection: "manual",
      agents: [{ agent: "claude", isPicked: true }, { agent: "codex", isPicked: true }, { agent: "cursor", isPicked: false }],
    })
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

    const { form } = buildSetupPage(sourceOf({ setup: AT_FORGES, step: "agents", agentDetections }))

    expect(form).toMatchObject({
      defaultAgent: null,
      agents: [{ agent: "claude", isPicked: true }, { agent: "codex", isPicked: false }, { agent: "cursor", isPicked: false }],
    })
  })

  it("lists what manual prompting gives up and tells that direct adds no billing", () => {
    const { form } = buildSetupPage(sourceOf({}))

    expect(form).toMatchObject({
      connectionOptions: [
        { connection: "direct", tagLabel: "Recommended", unavailableFeatures: [] },
        {
          connection: "manual",
          unavailableFeatures: ["Chatting with the agent from a review", "Applying a fix from a finding"],
        },
      ],
    })
    expect(JSON.stringify(form)).toContain("It does not use the agent's SDK")
  })

  it("offers every forge and marks a command line tool that cannot be used", () => {
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
        { forge: "git", availability: { kind: "available", statusLabel: null } },
        { forge: "gh", availability: { kind: "available", statusLabel: "Signed in as dev-harper" } },
        { forge: "glab", availability: { kind: "unavailable", reason: "glab is not installed on this machine." } },
        { forge: "github", fields: [{ name: "token", isSecret: true }, { name: "baseUrl" }] },
        { forge: "gitlab", fields: [{ name: "token" }, { name: "baseUrl" }] },
        { forge: "bitbucket", fields: [{ name: "username" }, { name: "token" }] },
      ],
    })
  })

  it("lists what local git cannot do", () => {
    const { form } = buildSetupPage(sourceOf({ setup: AT_FORGES, step: "forges" }))

    expect(form).toMatchObject({
      forges: [
        {
          forge: "git",
          limitation: {
            label: "With local git only, Flight Plan cannot:",
            items: [
              "List pull requests to review",
              "Filter pull requests by label",
              "Filter pull requests by their review state",
              "Show the author and each reviewer's state",
              "Link into the forge's own diff view",
            ],
          },
        },
        { forge: "gh", limitation: null },
        { forge: "glab" },
        { forge: "github" },
        { forge: "gitlab" },
        { forge: "bitbucket" },
      ],
    })
  })

  it("always picks local git, locks it, and makes it the default until another default is saved", () => {
    const { form } = buildSetupPage(sourceOf({ setup: AT_FORGES, step: "forges" }))

    expect(form).toMatchObject({
      defaultForge: "git",
      forges: [
        { forge: "git", isPicked: true, isRequired: true },
        { forge: "gh", isPicked: false, isRequired: false },
        { forge: "glab", isRequired: false },
        { forge: "github", isRequired: false },
        { forge: "gitlab", isRequired: false },
        { forge: "bitbucket", isRequired: false },
      ],
    })
  })

  it("never sends a saved token back and says that one is saved", () => {
    const { form } = buildSetupPage(sourceOf({ setup: { ...AT_FORGES, forges: GITHUB_FORGES }, step: "forges" }))

    expect(form).toMatchObject({
      defaultForge: "gh",
      forges: [
        { forge: "git", isPicked: true },
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
      selectedPreset: "standard",
      presets: [{ preset: "standard" }, { preset: "minimal" }, { preset: "onboardee" }, { preset: "unfamiliar-territory" }],
    })
    expect(buildSetupPage(sourceOf({ setup: AT_REPOSITORIES, step: "configuration" })).form).toMatchObject({
      selectedPreset: "minimal",
    })
  })

  it("holds the finish on local git until the user says which user they are", () => {
    const setup = { ...AT_REPOSITORIES, repositories: [CHECKOUT_WEB] }

    expect(buildSetupPage(sourceOf({ setup, step: "repositories" })).form).toMatchObject({
      isReadyToFinish: false,
      finishHint: "Pick which user you are in checkout-web.",
      repositories: [{ selfAuthor: { author: null, stateLabel: "Not chosen" } }],
    })
  })

  it("holds the finish until a repository is added and a user is tracked", () => {
    const empty = buildSetupPage(sourceOf({ setup: AT_REPOSITORIES, step: "repositories" })).form
    const ready = buildSetupPage(sourceOf({ setup: READY_TO_FINISH, step: "repositories" })).form

    expect(empty).toMatchObject({ isReadyToFinish: false, finishHint: "Add at least one repository." })
    expect(ready).toMatchObject({
      isReadyToFinish: true,
      finishHint: null,
      repositories: [
        {
          name: "checkout-web",
          lineColor: "blue",
          lineLabel: "C",
          missingAuthorMessage: null,
          trackedAuthors: [{ name: "Lena Okafor", monogram: "LO" }],
        },
      ],
    })
  })

  it("invites a forge user to track a user before the repository can be followed", () => {
    const setup = { ...READY_TO_FINISH, forges: GITHUB_FORGES, repositories: [CHECKOUT_WEB] }

    expect(buildSetupPage(sourceOf({ setup, step: "repositories" })).form).toMatchObject({
      repositories: [
        { missingAuthorMessage: "Track a user and Flight Plan will follow their pull requests in this repository." },
      ],
    })
  })

  it("asks a local git user which user they are, and no forge user", () => {
    const localGit = buildSetupPage(sourceOf({ setup: READY_TO_FINISH, step: "repositories" })).form
    const github = buildSetupPage(
      sourceOf({ setup: { ...READY_TO_FINISH, forges: GITHUB_FORGES }, step: "repositories" }),
    ).form

    expect(localGit).toMatchObject({
      repositories: [
        {
          authorSearchHint: "Search by name or email. The people who committed most recently come first.",
          authorSearchPlaceholder: "Type a name or email",
          missingAuthorMessage: null,
          selfAuthor: {
            hint: "Git cannot tell who you are here. Search for the name or email you commit with, then pick yourself.",
            author: { name: "Dev Harper", monogram: "DH" },
            stateLabel: "You",
          },
        },
      ],
    })
    expect(github).toMatchObject({
      repositories: [
        {
          authorSearchHint: "Search by name or username. Results come from GitHub CLI.",
          authorSearchPlaceholder: "Type a name or username",
          selfAuthor: null,
        },
      ],
    })
  })
})

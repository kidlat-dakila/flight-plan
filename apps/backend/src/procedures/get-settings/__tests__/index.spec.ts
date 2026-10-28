import { createConfiguration } from "@/procedures/create-configuration"
import { getSettings } from "@/procedures/get-settings"
import {
  AT_REPOSITORIES,
  CHECKOUT_WEB,
  createSetupContext,
  GITHUB_FORGES,
  LENA,
  STOREFRONT,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP, type Setup } from "@/procedures/get-setup/utils/setup"

const COMPLETE_SETUP: Setup = { ...AT_REPOSITORIES, isComplete: true }
const NO_AUTHORS = { selfAuthor: null, trackedAuthors: [] }

describe("getSettings", () => {
  it("fills the agents section with the saved agents and their models", async () => {
    const page = await getSettings({ section: "agents" }, createSetupContext(COMPLETE_SETUP))

    expect(page).toMatchObject({
      section: "agents",
      agents: [
        { agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", modelOptions: [{ model: "default" }, {}, {}, {}] },
        { agent: "codex", isPicked: true, installPath: "/Users/dev/.codex" },
        { agent: "cursor", isPicked: false },
      ],
      defaultAgent: "codex",
    })
  })

  it("offers the installed terminal apps in the agents section and selects the saved one", async () => {
    const page = await getSettings({ section: "agents" }, createSetupContext(COMPLETE_SETUP))

    expect(page).toMatchObject({
      terminalApps: [{ terminalApp: "terminal", label: "Terminal" }, { terminalApp: "iterm", label: "iTerm2" }],
      terminalApp: "iterm",
    })
  })

  it("fills the forges section with the saved connections and what each command line program reports", async () => {
    const setup: Setup = { ...COMPLETE_SETUP, forges: GITHUB_FORGES }
    const page = await getSettings({ section: "forges" }, createSetupContext(setup))

    expect(page).toMatchObject({
      section: "forges",
      forges: [
        { forge: "gh", isPicked: true, availability: { kind: "available" } },
        { forge: "glab", isPicked: false, availability: { kind: "unavailable" } },
        { forge: "github", isPicked: true },
        { forge: "gitlab", isPicked: false },
        { forge: "bitbucket", isPicked: false },
      ],
    })
  })

  it("lists the repositories Flight Plan follows, not the ones of the setup", async () => {
    const context = createSetupContext(COMPLETE_SETUP)
    await context.repositoryStore.add(STOREFRONT, { selfAuthor: null, trackedAuthors: [LENA] })

    await expect(getSettings({ section: "repositories" }, context)).resolves.toMatchObject({
      section: "repositories",
      repositories: [{ name: "storefront", trackedAuthors: [{ name: "Lena Okafor" }], emptyMessage: null }],
    })
  })

  it("shows the base branch saved for each followed repository, and the detected main branch for one saved without it", async () => {
    const context = createSetupContext(COMPLETE_SETUP)
    await context.repositoryStore.add(STOREFRONT, NO_AUTHORS)
    await context.repositoryStore.add({ ...STOREFRONT, name: "checkout-web", path: CHECKOUT_WEB.path, baseBranch: "develop" }, NO_AUTHORS)

    await expect(getSettings({ section: "repositories" }, context)).resolves.toMatchObject({
      repositories: [{ name: "storefront", baseBranch: "main" }, { name: "checkout-web", baseBranch: "develop" }],
    })
  })

  it("opens a section before anything is saved", async () => {
    const page = await getSettings({ section: "repositories" }, createSetupContext(EMPTY_SETUP))

    expect(page).toMatchObject({ section: "repositories", repositories: [] })
  })

  it("fills the review section as setup step 4 does, with the user's own configurations after the presets", async () => {
    const context = createSetupContext(COMPLETE_SETUP)
    await createConfiguration({ name: "Terse", sourceId: "minimal" }, context)

    const page = await getSettings({ section: "review" }, context)

    expect(page).toMatchObject({
      section: "review",
      selectedConfigurationId: "minimal",
      preferences: { spotlight: ["page", "component", "api-route", "database-read-write", "data-model", "hook"], isSegmented: false, walkthroughOrder: "imports-bottom-up" },
    })
    expect(page.section === "review" ? page.presets.map((option) => option.configurationId) : []).toStrictEqual([
      "standard",
      "minimal",
      "onboardee",
      "unfamiliar-territory",
      "custom-terse",
    ])
    expect(page).toHaveProperty("presets.4", {
      configurationId: "custom-terse",
      label: "Terse",
      bestFor: "Based on Minimal.",
      description: "The agent writes in fragments: few words and no filler.",
      note: null,
    })
    expect(page).toHaveProperty("spotlightGroups.0.label", "General")
  })
})

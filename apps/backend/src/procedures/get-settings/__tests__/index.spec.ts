import { getSettings } from "@/procedures/get-settings"
import {
  AT_REPOSITORIES,
  createSetupContext,
  GITHUB_FORGES,
  LENA,
  STOREFRONT,
} from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP, type Setup } from "@/procedures/get-setup/utils/setup"

const COMPLETE_SETUP: Setup = { ...AT_REPOSITORIES, isComplete: true }

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

  it("fills the forges section with the saved connections and what each command line program reports", async () => {
    const setup: Setup = { ...COMPLETE_SETUP, forges: GITHUB_FORGES }
    const page = await getSettings({ section: "forges" }, createSetupContext(setup))

    expect(page).toMatchObject({
      section: "forges",
      hasCodeHost: true,
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
      emptyMessage: null,
    })
  })

  it("opens a section before anything is saved", async () => {
    const page = await getSettings({ section: "repositories" }, createSetupContext(EMPTY_SETUP))

    expect(page).toMatchObject({ section: "repositories", repositories: [] })
  })
})

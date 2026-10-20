import { DEFAULT_REVIEW_PREFERENCES } from "@/procedures/get-review-preferences/utils/review-preferences"
import { GITHUB_FORGES, READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { formatSettings, parseSettings } from "@/procedures/get-setup/utils/stored-settings"

describe("parseSettings", () => {
  it("reads missing settings as the empty setup", () => {
    expect(parseSettings(null)).toStrictEqual(EMPTY_SETUP)
  })

  it("reads back the setup it formatted", () => {
    expect(parseSettings(formatSettings(READY_TO_FINISH))).toStrictEqual(READY_TO_FINISH)
  })

  it("saves the default configuration beside the setup, not inside it", () => {
    const settings: unknown = JSON.parse(formatSettings(READY_TO_FINISH))

    expect(settings).toMatchObject({ defaultConfiguration: "minimal", setup: { isComplete: false } })
    expect(settings).not.toHaveProperty("setup.preset")
  })

  it("saves no default configuration as null and reads it back as none", () => {
    const settings: unknown = JSON.parse(formatSettings(EMPTY_SETUP))

    expect(settings).toMatchObject({ defaultConfiguration: null })
    expect(parseSettings(formatSettings(EMPTY_SETUP))?.defaultConfiguration).toBeNull()
  })

  it("reads a default configuration of the user's own by its id", () => {
    const saved = formatSettings({ ...EMPTY_SETUP, defaultConfiguration: "short-reviews" })

    expect(parseSettings(saved)?.defaultConfiguration).toBe("short-reviews")
  })

  it("saves the review preferences beside the setup and reads them back", () => {
    const withPreferences = { ...READY_TO_FINISH, reviewPreferences: { ...DEFAULT_REVIEW_PREFERENCES, spotlight: ["security" as const] } }
    const settings: unknown = JSON.parse(formatSettings(withPreferences))

    expect(settings).toMatchObject({ reviewPreferences: { spotlight: ["security"] } })
    expect(settings).not.toHaveProperty("setup.reviewPreferences")
    expect(parseSettings(formatSettings(withPreferences))).toStrictEqual(withPreferences)
  })

  it("reads settings saved before review preferences existed as no saved preferences", () => {
    const settings = { defaultConfiguration: null, setup: { agents: null, forges: null, repositories: [], isComplete: false } }

    expect(parseSettings(JSON.stringify(settings))?.reviewPreferences).toBeNull()
  })

  it("reads a spotlight saved before the classifications were renamed and merged under their current names", () => {
    const settings = {
      defaultConfiguration: null,
      reviewPreferences: { ...DEFAULT_REVIEW_PREFERENCES, spotlight: ["auth", "state", "store", "realtime", "migration"] },
      setup: { agents: null, forges: null, repositories: [], isComplete: false },
    }

    expect(parseSettings(JSON.stringify(settings))?.reviewPreferences?.spotlight).toStrictEqual(["migration", "websocket", "ui-state", "security"])
  })

  it("refuses review preferences with a classification Flight Plan does not know", () => {
    const settings = {
      defaultConfiguration: null,
      reviewPreferences: { ...DEFAULT_REVIEW_PREFERENCES, spotlight: ["sorcery"] },
      setup: { agents: null, forges: null, repositories: [], isComplete: false },
    }

    expect(parseSettings(JSON.stringify(settings))).toBeNull()
  })

  it("reads forges saved with a default forge, and drops the default", () => {
    const saved = formatSettings({ ...READY_TO_FINISH, forges: GITHUB_FORGES })
    const savedWithDefault = saved.replace("\"connections\":", "\"defaultForge\": \"gh\", \"connections\":")

    expect(savedWithDefault).not.toBe(saved)
    expect(parseSettings(savedWithDefault)).toStrictEqual({ ...READY_TO_FINISH, forges: GITHUB_FORGES })
  })

  it("refuses text that is not JSON", () => {
    expect(parseSettings("{ not json")).toBeNull()
  })

  it("refuses a setup with an agent Flight Plan does not know", () => {
    const settings = { defaultConfiguration: null, setup: { ...EMPTY_SETUP, agents: { installs: [], defaultAgent: "copilot" } } }

    expect(parseSettings(JSON.stringify(settings))).toBeNull()
  })

  it("reads an install saved before models and efforts could be chosen as the agent's default model and effort", () => {
    const settings = {
      defaultConfiguration: null,
      setup: {
        agents: { installs: [{ agent: "claude", installPath: "/Users/dev/.claude" }], defaultAgent: "claude" },
        forges: null,
        repositories: [],
        isComplete: false,
      },
    }

    expect(parseSettings(JSON.stringify(settings))?.agents?.installs).toStrictEqual([
      { agent: "claude", installPath: "/Users/dev/.claude", model: "default", effort: "default" },
    ])
  })
})

import { READY_TO_FINISH } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
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

  it("saves no default configuration as null and reads it back as no preset", () => {
    const settings: unknown = JSON.parse(formatSettings(EMPTY_SETUP))

    expect(settings).toMatchObject({ defaultConfiguration: null })
    expect(parseSettings(formatSettings(EMPTY_SETUP))?.preset).toBeNull()
  })

  it("refuses a default configuration Flight Plan does not know", () => {
    const settings = { defaultConfiguration: "verbose", setup: { ...EMPTY_SETUP, preset: undefined } }

    expect(parseSettings(JSON.stringify(settings))).toBeNull()
  })

  it("refuses text that is not JSON", () => {
    expect(parseSettings("{ not json")).toBeNull()
  })

  it("refuses a setup with an agent Flight Plan does not know", () => {
    const settings = { defaultConfiguration: null, setup: { ...EMPTY_SETUP, agents: { installs: [], defaultAgent: "copilot", connection: "direct" } } }

    expect(parseSettings(JSON.stringify(settings))).toBeNull()
  })

  it("reads an install saved before models and efforts could be chosen as the agent's default model and effort", () => {
    const settings = {
      defaultConfiguration: null,
      setup: {
        agents: { installs: [{ agent: "claude", installPath: "/Users/dev/.claude" }], defaultAgent: "claude", connection: "direct" },
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

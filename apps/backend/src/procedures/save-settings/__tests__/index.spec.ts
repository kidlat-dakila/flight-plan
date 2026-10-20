import { createConfiguration } from "@/procedures/create-configuration"
import { DEFAULT_REVIEW_PREFERENCES } from "@/procedures/get-review-preferences/utils/review-preferences"
import { toPreferencesData } from "@/procedures/get-review-preferences/utils/schemas"
import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP, type Setup } from "@/procedures/get-setup/utils/setup"
import { saveSettings } from "@/procedures/save-settings"
import type { SaveSettingsInput } from "@/procedures/save-settings/utils/schemas"

const COMPLETE_SETUP: Setup = { ...AT_REPOSITORIES, isComplete: true }

const AGENTS_INPUT: SaveSettingsInput = {
  section: "agents",
  agents: [{ agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", model: "default", effort: "default" }],
  defaultAgent: null,
}

const PREFERENCES = toPreferencesData(DEFAULT_REVIEW_PREFERENCES)

describe("saveSettings", () => {
  it("saves the agents and leaves the rest of the setup as it is", async () => {
    const context = createSetupContext(COMPLETE_SETUP)

    await expect(saveSettings(AGENTS_INPUT, context)).resolves.toStrictEqual({
      kind: "saved",
      message: "Your agents are saved.",
    })
    await expect(context.setupStore.read()).resolves.toMatchObject({
      agents: { installs: [{ agent: "claude" }], defaultAgent: "claude" },
      forges: COMPLETE_SETUP.forges,
      defaultConfiguration: "minimal",
      isComplete: true,
    })
  })

  it("saves the forges", async () => {
    const context = createSetupContext(COMPLETE_SETUP)
    const input: SaveSettingsInput = {
      section: "forges",
      forges: [{ forge: "gh", isPicked: true, username: "", token: "", baseUrl: "" }],
    }

    await expect(saveSettings(input, context)).resolves.toStrictEqual({
      kind: "saved",
      message: "Your git forges are saved.",
    })
    await expect(context.setupStore.read()).resolves.toMatchObject({ forges: { connections: [{ forge: "git" }, { forge: "gh" }] } })
  })

  it("saves the default configuration", async () => {
    const context = createSetupContext(COMPLETE_SETUP)

    await expect(saveSettings({ section: "configuration", configurationId: "onboardee" }, context)).resolves.toStrictEqual({
      kind: "saved",
      message: "Your default configuration is saved.",
    })
    await expect(context.setupStore.read()).resolves.toMatchObject({ defaultConfiguration: "onboardee" })
  })

  it("saves a configuration of the user's own as the default, and refuses one that does not exist", async () => {
    const context = createSetupContext(COMPLETE_SETUP)
    await createConfiguration({ name: "Terse", sourceId: "minimal" }, context)

    await expect(saveSettings({ section: "configuration", configurationId: "custom-terse" }, context)).resolves.toMatchObject({ kind: "saved" })
    await expect(context.setupStore.read()).resolves.toMatchObject({ defaultConfiguration: "custom-terse" })
    await expect(saveSettings({ section: "configuration", configurationId: "custom-gone" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "This configuration no longer exists. Pick another one.",
      field: null,
    })
  })

  it("returns a rejection with its field and saves nothing", async () => {
    const context = createSetupContext(COMPLETE_SETUP)
    const input: SaveSettingsInput = {
      ...AGENTS_INPUT,
      agents: [{ agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", model: "gpt", effort: "default" }],
    }

    await expect(saveSettings(input, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Choose one of the models Claude offers.",
      field: { owner: "claude", name: "model" },
    })
    await expect(context.setupStore.read()).resolves.toStrictEqual(COMPLETE_SETUP)
  })

  it("refuses a section whose earlier setup steps are not saved", async () => {
    const context = createSetupContext(EMPTY_SETUP)

    await expect(saveSettings({ section: "configuration", configurationId: "minimal" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Finish the earlier steps of the setup first.",
      field: null,
    })
  })

  it("saves the review preferences and the default configuration together", async () => {
    const context = createSetupContext(COMPLETE_SETUP)
    const preferences = { ...PREFERENCES, spotlight: ["security" as const], isSegmented: false }

    await expect(saveSettings({ section: "review", configurationId: "onboardee", preferences }, context)).resolves.toStrictEqual({
      kind: "saved",
      message: "Your review configuration is saved.",
    })
    await expect(context.setupStore.read()).resolves.toMatchObject({
      defaultConfiguration: "onboardee",
      reviewPreferences: { spotlight: ["security"], isSegmented: false },
    })
  })

  it("refuses a path pattern with its row and keeps the saved review configuration", async () => {
    const context = createSetupContext(COMPLETE_SETUP)
    const preferences = { ...PREFERENCES, ignoredPaths: ["**/e2e/**", "**/e2e/**"] }

    await expect(saveSettings({ section: "review", configurationId: "onboardee", preferences }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "This pattern is already in the list.",
      field: { owner: "ignoredPaths", name: "1" },
    })
    await expect(context.setupStore.read()).resolves.toStrictEqual(COMPLETE_SETUP)
  })
})

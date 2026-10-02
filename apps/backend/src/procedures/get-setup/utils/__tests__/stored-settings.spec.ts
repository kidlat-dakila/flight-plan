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

  it("refuses text that is not JSON", () => {
    expect(parseSettings("{ not json")).toBeNull()
  })

  it("refuses a setup with an agent Flight Plan does not know", () => {
    const settings = { setup: { ...EMPTY_SETUP, agents: { installs: [], defaultAgent: "copilot", connection: "direct" } } }

    expect(parseSettings(JSON.stringify(settings))).toBeNull()
  })
})

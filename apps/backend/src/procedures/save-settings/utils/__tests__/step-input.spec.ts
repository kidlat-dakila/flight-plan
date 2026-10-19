import { toStepInput } from "@/procedures/save-settings/utils/step-input"

describe("toStepInput", () => {
  it("names the setup step of the agents section", () => {
    const agents = [{ agent: "claude" as const, isPicked: true, installPath: "/Users/dev/.claude", model: "default", effort: "default" }]

    expect(toStepInput({ section: "agents", agents, defaultAgent: "claude" })).toStrictEqual({
      step: "agents",
      agents,
      defaultAgent: "claude",
    })
  })

  it("names the setup step of the forges section", () => {
    const forges = [{ forge: "gh" as const, isPicked: true, username: "", token: "", baseUrl: "" }]

    expect(toStepInput({ section: "forges", forges, defaultForge: null })).toStrictEqual({
      step: "forges",
      forges,
      defaultForge: null,
    })
  })

  it("names the setup step of the configuration section", () => {
    expect(toStepInput({ section: "configuration", configurationId: "minimal" })).toStrictEqual({
      step: "configuration",
      configurationId: "minimal",
    })
  })
})

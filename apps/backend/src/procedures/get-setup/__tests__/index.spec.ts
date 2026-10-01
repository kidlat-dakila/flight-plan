import { getSetup } from "@/procedures/get-setup"
import { AT_CONFIGURATION, AT_FORGES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"

describe("getSetup", () => {
  it("opens the agents step with the folders detected on the machine", async () => {
    const page = await getSetup({ step: null }, createSetupContext(EMPTY_SETUP))

    expect(page.progressLabel).toBe("Step 1 of 4")
    expect(page.form).toMatchObject({
      step: "agents",
      agents: [{ installPath: "/Users/dev/.claude" }, { installPath: "/Users/dev/.codex" }, { installPath: "" }],
    })
  })

  it("resumes at the first step that is not saved", async () => {
    const page = await getSetup({ step: null }, createSetupContext(AT_FORGES))

    expect(page.form).toMatchObject({
      step: "forges",
      forges: [{ forge: "git" }, { forge: "gh", availability: { kind: "available" } }, { forge: "glab", availability: { kind: "unavailable" } }, {}, {}, {}],
    })
  })

  it("opens an earlier step on request and refuses a later one", async () => {
    const context = createSetupContext(AT_CONFIGURATION)

    await expect(getSetup({ step: "agents" }, context)).resolves.toMatchObject({ form: { step: "agents" } })
    await expect(getSetup({ step: "repositories" }, context)).resolves.toMatchObject({ form: { step: "configuration" } })
  })
})

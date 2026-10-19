import { getSetup } from "@/procedures/get-setup"
import { AT_AGENTS, AT_CONFIGURATION, AT_FORGES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"

describe("getSetup", () => {
  it("opens the repositories step when nothing is saved", async () => {
    const page = await getSetup({ step: null }, createSetupContext(EMPTY_SETUP))

    expect(page.progressLabel).toBe("Step 1 of 4")
    expect(page.backStep).toBeNull()
    expect(page.form).toMatchObject({ step: "repositories", repositories: [], isReadyToContinue: false })
  })

  it("opens the agents step third, with the folders detected on the machine", async () => {
    const page = await getSetup({ step: null }, createSetupContext(AT_AGENTS))

    expect(page.progressLabel).toBe("Step 3 of 4")
    expect(page.form).toMatchObject({
      step: "agents",
      agents: [{ installPath: "/Users/dev/.claude" }, { installPath: "/Users/dev/.codex" }, { installPath: "" }],
    })
  })

  it("offers the models each agent with a command line program lists", async () => {
    const page = await getSetup({ step: null }, createSetupContext(AT_AGENTS))

    expect(page.form).toMatchObject({
      agents: [
        {
          agent: "claude",
          modelOptions: [
            { model: "default", label: "Default (recommended)" },
            { model: "opus", label: "Opus" },
            { model: "sonnet", label: "Sonnet" },
            { model: "haiku", label: "Haiku" },
          ],
        },
        { agent: "codex", modelOptions: [{ model: "default", label: "Your Codex default" }] },
        { agent: "cursor", modelOptions: [{ model: "default", label: "Your Cursor default" }] },
      ],
    })
  })

  it("asks an agent for its models again to name the saved model on a later step", async () => {
    const setup = {
      ...AT_CONFIGURATION,
      agents: {
        installs: [{ agent: "claude", installPath: "/Users/dev/.claude", model: "haiku", effort: "default" }],
        defaultAgent: "claude",
      },
    } as const
    const page = await getSetup({ step: "configuration" }, createSetupContext(setup))

    expect(page.route[2]?.lines[0]).toStrictEqual([{ text: "Claude, Haiku", kind: "plain" }])
  })

  it("resumes at the first step that is not saved", async () => {
    const page = await getSetup({ step: null }, createSetupContext(AT_FORGES))

    expect(page.form).toMatchObject({
      step: "forges",
      forges: [{ forge: "gh", availability: { kind: "available" } }, { forge: "glab", availability: { kind: "unavailable" } }, {}, {}, {}],
    })
  })

  it("opens an earlier step on request and refuses a later one", async () => {
    const context = createSetupContext(AT_CONFIGURATION)

    await expect(getSetup({ step: "repositories" }, context)).resolves.toMatchObject({ form: { step: "repositories" } })
    await expect(getSetup({ step: "agents" }, createSetupContext(AT_FORGES))).resolves.toMatchObject({ form: { step: "forges" } })
  })
})

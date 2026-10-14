import { createConfiguration } from "@/procedures/create-configuration"
import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { listConfigurations } from "@/procedures/list-configurations"
import { saveConfiguration } from "@/procedures/save-configuration"

describe("listConfigurations", () => {
  it("lists the four presets, marks the default and says there is no configuration of the user's own", async () => {
    const list = await listConfigurations(createSetupContext(AT_REPOSITORIES))

    expect(list.groups).toMatchObject([
      {
        title: "Presets",
        rows: [
          { id: "standard", name: "Standard", defaultLabel: null },
          { id: "minimal", name: "Minimal", defaultLabel: "Default", isDefault: true },
          { id: "onboardee", name: "Onboardee", defaultLabel: null },
          { id: "unfamiliar-territory", name: "Unfamiliar territory", defaultLabel: null },
        ],
        emptyMessage: null,
      },
      { title: "Your configurations", rows: [], emptyMessage: "You have no configuration of your own yet. Duplicate a preset to start one." },
    ])
  })

  it("says where a configuration comes from, how many instructions it changed and which sections are off", async () => {
    const context = createSetupContext(AT_REPOSITORIES)
    await createConfiguration({ name: "Terse", sourceId: "minimal" }, context)
    await saveConfiguration({ change: "field", id: "custom-terse", path: "context", texts: [{ key: "context", text: "Two sentences." }] }, context)

    const list = await listConfigurations(context)

    expect(list.groups[1]?.rows).toStrictEqual([
      {
        id: "custom-terse",
        name: "Terse",
        summary: null,
        details: [
          { text: "Based on Minimal", kind: "plain" },
          { text: "1 instruction changed", kind: "plain" },
          { text: "Journey Flow Diagrams off", kind: "plain" },
          { text: "Blast Diagram off", kind: "plain" },
          { text: "Findings off", kind: "plain" },
        ],
        defaultLabel: null,
        isDefault: false,
        defaultChoiceLabel: "Use Terse by default",
        duplicateLabel: "Duplicate",
        duplicateName: "Duplicate Terse",
      },
    ])
  })
})

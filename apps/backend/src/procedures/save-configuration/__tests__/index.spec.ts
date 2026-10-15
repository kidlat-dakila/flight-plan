import { createConfiguration } from "@/procedures/create-configuration"
import { getConfiguration } from "@/procedures/get-configuration"
import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { saveConfiguration } from "@/procedures/save-configuration"

const FINDING_KIND = "walkthrough.files.waypoints.findings.kind"

const createContextWithTerse = async () => {
  const context = createSetupContext(AT_REPOSITORIES)
  await createConfiguration({ name: "Terse", sourceId: "standard" }, context)
  return context
}

describe("saveConfiguration", () => {
  it("saves the instruction of a field, also on a preset", async () => {
    const context = createSetupContext(AT_REPOSITORIES)

    await expect(
      saveConfiguration({ change: "field", id: "standard", path: "context", texts: [{ key: "context", text: "Two sentences." }] }, context),
    ).resolves.toStrictEqual({ kind: "saved", message: "This field is saved." })

    await expect(getConfiguration({ id: "standard", field: "context" }, context)).resolves.toMatchObject({
      panel: { texts: [{ value: "Two sentences.", isChanged: true }], resetLabel: "Reset to the shipped instruction" },
    })
  })

  it("keeps a field unchanged when the saved text is what the preset ships", async () => {
    const context = await createContextWithTerse()

    await saveConfiguration({ change: "field", id: "custom-terse", path: "context", texts: [{ key: "context", text: "How standard writes context." }] }, context)

    await expect(getConfiguration({ id: "custom-terse", field: "context" }, context)).resolves.toMatchObject({
      panel: { texts: [{ isChanged: false }], resetLabel: null },
    })
  })

  it("resets every text of a field", async () => {
    const context = await createContextWithTerse()
    await saveConfiguration({ change: "field", id: "custom-terse", path: FINDING_KIND, texts: [{ key: `${FINDING_KIND}.bug`, text: "Wrong on some input." }] }, context)

    await expect(saveConfiguration({ change: "reset", id: "custom-terse", path: FINDING_KIND }, context)).resolves.toStrictEqual({
      kind: "saved",
      message: "This field is reset.",
    })
    await expect(getConfiguration({ id: "custom-terse", field: FINDING_KIND }, context)).resolves.toMatchObject({ panel: { resetLabel: null } })
  })

  it("switches sections and context code block kinds, and keeps the Code Walkthrough on", async () => {
    const context = await createContextWithTerse()

    await saveConfiguration({ change: "switches", id: "custom-terse", sections: ["findings"], contextCodeBlockKinds: ["library"] }, context)

    const page = await getConfiguration({ id: "custom-terse", field: null }, context)
    expect(page).toMatchObject({
      panel: {
        sections: [{ section: "journey", isOn: false }, { section: "blast", isOn: false }, { section: "findings", isOn: true }],
        contextKinds: [{ kind: "codebase", isRequired: false }, { kind: "library", isRequired: true }, { kind: "language", isRequired: false }],
      },
    })
    const entries = page.kind === "found" ? page.index.flatMap((group) => group.entries) : []
    expect(entries.find((entry) => entry.key === "sections")).toMatchObject({ mark: "changed" })
    expect(entries.find((entry) => entry.key === "walkthrough.files.waypoints.title")).toMatchObject({ mark: "unchanged" })
    expect(entries.find((entry) => entry.key === "journey.description")).toMatchObject({ mark: "off" })
  })

  it("switches one section and leaves the others as they are", async () => {
    const context = await createContextWithTerse()

    await expect(saveConfiguration({ change: "section", id: "custom-terse", section: "blast", isOn: false }, context)).resolves.toStrictEqual({
      kind: "saved",
      message: "Blast Diagram: switched off.",
    })
    await expect(getConfiguration({ id: "custom-terse", field: null }, context)).resolves.toMatchObject({
      index: [{}, {}, {}, { switch: { section: "journey", label: "Generate Journey Flow Diagrams", isOn: true } }, { switch: { section: "blast", isOn: false } }, { switch: { section: "findings", isOn: true } }, { switch: null }, { switch: null }],
      panel: { sections: [{ isOn: true }, { isOn: false }, { isOn: true }] },
    })
  })

  it("renames a configuration of the user's own and refuses to rename a preset", async () => {
    const context = await createContextWithTerse()

    await expect(saveConfiguration({ change: "rename", id: "custom-terse", name: "Short" }, context)).resolves.toStrictEqual({ kind: "saved", message: "The name is saved." })
    await expect(saveConfiguration({ change: "rename", id: "standard", name: "Mine" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "A preset keeps its name. Duplicate it to name your own.",
    })
    await expect(saveConfiguration({ change: "rename", id: "custom-terse", name: "Standard" }, context)).resolves.toMatchObject({ kind: "rejected" })
  })

  it("rejects an empty instruction, a text of another field and a configuration that does not exist", async () => {
    const context = await createContextWithTerse()

    await expect(saveConfiguration({ change: "field", id: "custom-terse", path: "context", texts: [{ key: "context", text: "  " }] }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "An instruction cannot be empty. Write it, or reset the field.",
    })
    await expect(saveConfiguration({ change: "field", id: "custom-terse", path: "context", texts: [{ key: "writingStyle", text: "Loud." }] }, context)).resolves.toMatchObject({ kind: "rejected" })
    await expect(saveConfiguration({ change: "reset", id: "custom-gone", path: "context" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Flight Plan has no configuration at this address. It may have been deleted.",
    })
  })
})

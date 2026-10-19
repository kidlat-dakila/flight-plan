import { createConfiguration } from "@/procedures/create-configuration"
import { getConfiguration } from "@/procedures/get-configuration"
import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { saveConfiguration } from "@/procedures/save-configuration"

const WAYPOINT_TITLE = "walkthrough.files.waypoints.title"
const FINDING_KIND = "walkthrough.files.waypoints.findings.kind"

describe("getConfiguration", () => {
  it("opens the switches of a preset under a notice that a release can overwrite it", async () => {
    const page = await getConfiguration({ id: "minimal", field: null }, createSetupContext(AT_REPOSITORIES))

    expect(page).toMatchObject({
      kind: "found",
      name: "Minimal",
      originLabel: "Ships with Flight Plan",
      notice: { lead: "A release of Flight Plan can overwrite what you change in a preset.", advice: "Duplicate it to keep your changes." },
      canRename: false,
      canDelete: false,
      panel: {
        kind: "switches",
        sections: [
          { section: "traceDiagram", label: "Trace Diagrams", isOn: false },
          { section: "blastDiagram", label: "Blast Diagram", isOn: false },
          { section: "findings", label: "Findings", isOn: false },
        ],
        contextKinds: [{ kind: "codebase", isRequired: false }, { kind: "library", isRequired: false }, { kind: "language", isRequired: false }],
      },
    })
  })

  it("groups the editable fields in the index and marks the fields of a section that is off", async () => {
    const page = await getConfiguration({ id: "minimal", field: null }, createSetupContext(AT_REPOSITORIES))
    const index = page.kind === "found" ? page.index : []

    expect(index.map((group) => group.title)).toStrictEqual([
      null,
      "Voice",
      "Context",
      "Trace Diagram",
      "Blast Diagram",
      "Findings",
      "Code Walkthrough",
      "Context code blocks",
    ])
    expect(index[0]?.entries).toStrictEqual([
      { key: "sections", label: "Sections", mark: "unchanged", markLabel: "Not changed", isOpen: true },
    ])
    expect(index[3]?.entries.every((entry) => entry.mark === "off")).toBe(true)
    expect(index[6]?.entries.every((entry) => entry.mark === "unchanged")).toBe(true)
  })

  it("opens a field with what the configuration writes beside what its preset ships", async () => {
    const context = createSetupContext(AT_REPOSITORIES)
    await createConfiguration({ name: "Terse", sourceId: "standard" }, context)
    await saveConfiguration({ change: "field", id: "custom-terse", path: WAYPOINT_TITLE, texts: [{ key: WAYPOINT_TITLE, text: "Three words." }] }, context)

    const page = await getConfiguration({ id: "custom-terse", field: WAYPOINT_TITLE }, context)

    expect(page).toMatchObject({
      kind: "found",
      notice: null,
      canRename: true,
      canDelete: true,
      originLabel: "Based on Standard",
      panel: {
        kind: "field",
        path: WAYPOINT_TITLE,
        title: "Waypoint title",
        offMessage: null,
        texts: [
          {
            key: WAYPOINT_TITLE,
            label: "How to write it",
            value: "Three words.",
            shippedValue: `How standard writes ${WAYPOINT_TITLE}.`,
            shippedLabel: "Standard's instruction",
            isChanged: true,
          },
        ],
        resetLabel: "Reset to Standard",
      },
    })
    const entries = page.kind === "found" ? page.index.flatMap((group) => group.entries) : []
    expect(entries.find((entry) => entry.key === WAYPOINT_TITLE)).toMatchObject({ mark: "changed", isOpen: true })
  })

  it("gives a field with a fixed set of values one text per value", async () => {
    const page = await getConfiguration({ id: "standard", field: FINDING_KIND }, createSetupContext(AT_REPOSITORIES))
    const texts = page.kind === "found" && page.panel.kind === "field" ? page.panel.texts : []

    expect(texts.map((text) => text.label)).toStrictEqual([
      "How to write it",
      "What \"bug\" means",
      "What \"risk\" means",
      "What \"nit\" means",
      "What \"question\" means",
    ])
  })

  it("says so when no configuration has the id", async () => {
    await expect(getConfiguration({ id: "custom-gone", field: null }, createSetupContext(AT_REPOSITORIES))).resolves.toStrictEqual({
      kind: "missing",
      message: "Flight Plan has no configuration at this address. It may have been deleted.",
    })
  })
})

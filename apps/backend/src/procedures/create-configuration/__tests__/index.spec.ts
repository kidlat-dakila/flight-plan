import { createConfiguration } from "@/procedures/create-configuration"
import { getConfiguration } from "@/procedures/get-configuration"
import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { saveConfiguration } from "@/procedures/save-configuration"

describe("createConfiguration", () => {
  it("creates a configuration with the switches and the instructions of its source", async () => {
    const context = createSetupContext(AT_REPOSITORIES)
    await saveConfiguration({ change: "field", id: "minimal", path: "context", texts: [{ key: "context", text: "One line." }] }, context)

    await expect(createConfiguration({ name: "  Terse  ", sourceId: "minimal" }, context)).resolves.toStrictEqual({ kind: "created", id: "custom-terse" })

    await expect(getConfiguration({ id: "custom-terse", field: "context" }, context)).resolves.toMatchObject({
      name: "Terse",
      originLabel: "Based on Minimal",
      panel: { texts: [{ value: "One line." }] },
    })
  })

  it("names a duplicate after its source, with a number when that name is taken", async () => {
    const context = createSetupContext(AT_REPOSITORIES)

    await expect(createConfiguration({ name: null, sourceId: "standard" }, context)).resolves.toStrictEqual({ kind: "created", id: "custom-copy-of-standard" })
    await expect(createConfiguration({ name: null, sourceId: "standard" }, context)).resolves.toStrictEqual({ kind: "created", id: "custom-copy-of-standard-2" })
    await expect(getConfiguration({ id: "custom-copy-of-standard-2", field: null }, context)).resolves.toMatchObject({ name: "Copy of Standard 2" })
  })

  it("rejects an empty name, a name that is taken and a source that does not exist", async () => {
    const context = createSetupContext(AT_REPOSITORIES)

    await expect(createConfiguration({ name: " ", sourceId: "standard" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Enter a name for the configuration.",
      field: "name",
    })
    await expect(createConfiguration({ name: "minimal", sourceId: "standard" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Another configuration is already named minimal. Use a different name.",
      field: "name",
    })
    await expect(createConfiguration({ name: "Terse", sourceId: "custom-gone" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Choose the configuration to start from.",
      field: "source",
    })
  })
})

import { createConfiguration } from "@/procedures/create-configuration"
import { getConfigurationCreationForm } from "@/procedures/get-configuration-creation-form"
import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"

describe("getConfigurationCreationForm", () => {
  it("offers every configuration as a source and selects the default one", async () => {
    const context = createSetupContext(AT_REPOSITORIES)
    await createConfiguration({ name: "Terse", sourceId: "standard" }, context)

    const form = await getConfigurationCreationForm(context)

    expect(form.sources.map((source) => source.id)).toStrictEqual(["standard", "minimal", "onboardee", "unfamiliar-territory", "custom-terse"])
    expect(form.selectedSourceId).toBe("minimal")
  })
})

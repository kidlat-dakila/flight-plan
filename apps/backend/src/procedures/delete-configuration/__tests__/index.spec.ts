import { createConfiguration } from "@/procedures/create-configuration"
import { deleteConfiguration } from "@/procedures/delete-configuration"
import { AT_REPOSITORIES, createSetupContext } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { listConfigurations } from "@/procedures/list-configurations"

describe("deleteConfiguration", () => {
  it("deletes a configuration of the user's own", async () => {
    const context = createSetupContext(AT_REPOSITORIES)
    await createConfiguration({ name: "Terse", sourceId: "standard" }, context)

    await expect(deleteConfiguration({ id: "custom-terse" }, context)).resolves.toStrictEqual({ kind: "deleted" })
    await expect(listConfigurations(context)).resolves.toMatchObject({ groups: [{}, { rows: [] }] })
  })

  it("refuses to delete a preset and a configuration that does not exist", async () => {
    const context = createSetupContext(AT_REPOSITORIES)

    await expect(deleteConfiguration({ id: "standard" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "A preset cannot be deleted. Reset the fields you changed instead.",
    })
    await expect(deleteConfiguration({ id: "custom-gone" }, context)).resolves.toMatchObject({ kind: "rejected" })
  })
})

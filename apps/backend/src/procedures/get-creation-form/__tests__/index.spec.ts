import { createMockProcedureContext } from "@/procedures/context"
import { getCreationForm } from "@/procedures/get-creation-form"

const NOW = new Date("2026-10-01T12:00:00.000Z")

describe("getCreationForm", () => {
  it("asks for the pull request or branch the Flight Plan is for", async () => {
    await expect(getCreationForm({ repositoryName: "storefront" }, createMockProcedureContext(NOW))).resolves.toStrictEqual({
      title: "Create a Flight Plan",
      description: "For a pull request or a branch of storefront.",
      target: {
        label: "Pull request or branch",
        hint: "Your open pull requests come first, then the two branches with the latest commits.",
        placeholder: "Search by title, number or branch",
      },
    })
  })

  it("reports nothing for a repository that is not listed", async () => {
    await expect(getCreationForm({ repositoryName: "gone" }, createMockProcedureContext(NOW))).resolves.toBeNull()
  })
})

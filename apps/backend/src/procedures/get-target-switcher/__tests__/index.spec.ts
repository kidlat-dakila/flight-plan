import { createMockProcedureContext } from "@/procedures/context"
import { getTargetSwitcher } from "@/procedures/get-target-switcher"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const AUTHOR = "mira"

describe("getTargetSwitcher", () => {
  it("lists the branches the repository line shows, latest first, and names the one under review", async () => {
    const switcher = await getTargetSwitcher({ repositoryName: "storefront", targetId: "pr-412", query: "" }, createMockProcedureContext(NOW))

    expect(switcher?.heading).toBe("Branches in storefront")
    expect(switcher?.currentTargetId).toBe("pr-412")
    expect(switcher?.emptyLabel).toBeNull()
    expect(switcher?.targets.map((target) => target.id)).toStrictEqual(["pr-416", "pr-409", "pr-412", "pr-405", "pr-398"])
  })

  it("keeps the branch under review even when its status is filtered out of the repository line", async () => {
    const switcher = await getTargetSwitcher({ repositoryName: "storefront", targetId: "pr-401", query: "" }, createMockProcedureContext(NOW))

    expect(switcher?.targets.map((target) => target.id)).toContain("pr-401")
    expect(switcher?.targets.map((target) => target.id)).not.toContain("pr-395")
  })

  it("narrows the list to the pull requests whose title or author matches the query", async () => {
    const context = createMockProcedureContext(NOW)
    const byTitle = await getTargetSwitcher({ repositoryName: "storefront", targetId: "pr-412", query: "GIFT card" }, context)
    const byAuthor = await getTargetSwitcher({ repositoryName: "storefront", targetId: "pr-412", query: AUTHOR }, context)
    const nothing = await getTargetSwitcher({ repositoryName: "storefront", targetId: "pr-412", query: "zzz" }, context)

    expect(byTitle?.targets.map((target) => target.id)).toStrictEqual(["pr-416"])
    expect(byAuthor?.targets.every((target) => target.author?.name === AUTHOR)).toBe(true)
    expect(byAuthor?.targets.length).toBeGreaterThan(0)
    expect(nothing).toMatchObject({ targets: [], emptyLabel: "No pull request or branch matches." })
  })

  it("says why nothing is listed when the forge cannot be read, and reports nothing for a repository that is not listed", async () => {
    const context = createMockProcedureContext(NOW)

    await expect(getTargetSwitcher({ repositoryName: "ledger-api", targetId: "pr-1", query: "" }, context)).resolves.toMatchObject({
      emptyLabel: "Not signed in, or the token cannot see this repository.",
      targets: [],
    })
    await expect(getTargetSwitcher({ repositoryName: "gone", targetId: "pr-1", query: "" }, context)).resolves.toBeNull()
  })
})

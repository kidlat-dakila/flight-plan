import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { getImportForm } from "@/procedures/get-import-form"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { importReview } from "@/procedures/import-review"

const URL = "https://claude.ai/artifact/abc"
const INPUT = { ...KEY, artifactUrl: URL }

describe("importReview", () => {
  it("starts Claude with the request to fetch the Flight Plan, and the page then waits for it", async () => {
    const { context, spawner } = createConversationContext()

    const started = await importReview(INPUT, context)

    expect(started).toStrictEqual({ importId: "2026-10-03T12:00:00.000Z", message: "Asked your agent to fetch the Flight Plan." })
    expect(spawner.launches).toHaveLength(1)
    expect(spawner.launches[0]?.prompt).toContain("Fetch a Flight Plan from a Claude artifact")
    expect(spawner.launches[0]?.prompt).toContain("/sample-imports/storefront/pr-412.json")
    await expect(getImportForm(INPUT, context)).resolves.toMatchObject({ isImporting: true, importId: started.importId })
  })

  it("asks only once while an import is underway", async () => {
    const { context, spawner, clock } = createConversationContext()
    const first = await importReview(INPUT, context)
    clock.advance(1000)

    await expect(importReview(INPUT, context)).resolves.toStrictEqual(first)
    expect(spawner.launches).toHaveLength(1)
  })

  it("refuses a link that is not a Claude artifact's, and a repository that is not followed", async () => {
    const { context, spawner } = createConversationContext()

    await expect(importReview({ ...INPUT, artifactUrl: "https://example.com/x" }, context)).resolves.toMatchObject({ importId: null })
    await expect(importReview({ ...INPUT, repositoryName: "elsewhere" }, context)).resolves.toMatchObject({ importId: null })
    expect(spawner.launches).toHaveLength(0)
  })

  it("says why no agent could be asked, and leaves nothing underway", async () => {
    const { context } = createConversationContext({ setup: EMPTY_SETUP })

    await expect(importReview(INPUT, context)).resolves.toStrictEqual({
      importId: null,
      message: "No agent could be asked to fetch it. Finish the Agents step of the setup so Flight Plan can start an agent.",
    })
    await expect(context.reviewStore.readImportRequest(KEY)).resolves.toBeNull()
  })
})

import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { pendingInboundOf } from "@/procedures/get-conversation/utils/conversation"
import { getImportForm } from "@/procedures/get-import-form"
import { importReview } from "@/procedures/import-review"

const URL = "https://claude.ai/artifact/abc"
const INPUT = { ...KEY, artifactUrl: URL }

describe("importReview", () => {
  it("leaves the request to fetch the Flight Plan for the live agent, and the page waits while it is online", async () => {
    const { context, environment } = createConversationContext()
    environment.presence.openStream(KEY)

    const started = await importReview(INPUT, context)

    expect(started).toStrictEqual({ importId: "2026-10-03T12:00:00.000Z", message: "Asked your agent to fetch the Flight Plan." })
    const { journal } = await environment.store.read(KEY)
    const [request] = pendingInboundOf(journal).map(({ event }) => (event.kind === "reviewer-message" ? event.body : ""))
    expect(request).toContain("Fetch a Flight Plan from a Claude artifact")
    expect(request).toContain("/sample-imports/storefront/pr-412.json")
    await expect(getImportForm(INPUT, context)).resolves.toMatchObject({ isImporting: true, importId: started.importId })
  })

  it("asks only once while an import is underway", async () => {
    const { context, environment, clock } = createConversationContext()
    environment.presence.openStream(KEY)
    const first = await importReview(INPUT, context)
    clock.advance(1000)

    await expect(importReview(INPUT, context)).resolves.toStrictEqual(first)
    const { journal } = await environment.store.read(KEY)
    expect(pendingInboundOf(journal)).toHaveLength(1)
  })

  it("shows nothing underway while the agent is offline", async () => {
    const { context } = createConversationContext()

    await importReview(INPUT, context)

    await expect(getImportForm(INPUT, context)).resolves.toMatchObject({ isImporting: false })
  })

  it("refuses a link that is not a Claude artifact's, and a repository that is not followed", async () => {
    const { context, environment } = createConversationContext()

    await expect(importReview({ ...INPUT, artifactUrl: "https://example.com/x" }, context)).resolves.toMatchObject({ importId: null })
    await expect(importReview({ ...INPUT, repositoryName: "elsewhere" }, context)).resolves.toMatchObject({ importId: null })
    await expect(environment.store.read(KEY)).resolves.toMatchObject({ journal: [] })
  })
})

import { createConversationContext, KEY, reviewerMessage } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import { watchConversation } from "@/procedures/watch-conversation"

describe("watchConversation", () => {
  it("sends the conversation at once, then again after every change, until the watcher leaves", async () => {
    const { context } = createConversationContext()
    const leaving = new AbortController()
    const views = watchConversation(KEY, context, leaving.signal)

    const first = await views.next()
    const second = views.next()
    await appendAndPublish(KEY, [reviewerMessage("m1", "Hi")], context)

    expect(first.value).toMatchObject({ entries: [] })
    await expect(second).resolves.toMatchObject({ value: { entries: [{ id: "m1" }] } })
    const third = views.next()
    leaving.abort()
    await expect(third).resolves.toStrictEqual({ value: undefined, done: true })
  })
})

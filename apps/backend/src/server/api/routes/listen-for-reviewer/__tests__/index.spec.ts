import { createConversationContext, KEY, reviewerMessage } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { buildServer } from "@/server"

describe("GET /api/:repositoryName/:targetId/live/agent", () => {
  it("streams the waiting reply as one server-sent event, then closes", async () => {
    const { context, environment } = createConversationContext()
    await environment.store.append(KEY, [reviewerMessage("m1", "Why?\nAnd how?")])
    const server = await buildServer({}, context)

    const response = await server.inject({ method: "GET", url: "/api/storefront/pr-412/live/agent" })

    expect(response.statusCode).toBe(200)
    expect(response.headers["content-type"]).toContain("text/event-stream")
    expect(response.body).toContain("id: 1\nevent: work\ndata: The reviewer wrote:\ndata: Why?\ndata: And how?\n")
    await server.close()
  })

  it("answers 404 for a repository Flight Plan does not follow", async () => {
    const server = await buildServer({}, createConversationContext().context)

    const response = await server.inject({ method: "GET", url: "/api/billing/pr-1/live/agent" })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toStrictEqual({ message: "Flight Plan has no repository named \"billing\". It follows: storefront." })
    await server.close()
  })
})

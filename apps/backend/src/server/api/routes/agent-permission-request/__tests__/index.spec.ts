import { answerQuestions } from "@/procedures/answer-questions"
import { deliverToAgent } from "@/procedures/deliver-to-agent"
import {
  createConversationContext,
  flushPromises,
  KEY,
  reviewerMessage,
} from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { buildServer } from "@/server"

describe("POST /api/agent-hooks/permission-request", () => {
  it("answers with Claude's permission decision once the reviewer decides", async () => {
    const { context, environment } = createConversationContext()
    await environment.store.append(KEY, [reviewerMessage("m1", "Run the tests")])
    await deliverToAgent(KEY, context)
    const server = await buildServer({}, context)

    const responding = server.inject({
      method: "POST",
      url: "/api/agent-hooks/permission-request",
      payload: { session_id: "id-1", hook_event_name: "PermissionRequest", tool_name: "Bash", tool_input: { command: "npm test" } },
    })
    await flushPromises()
    await flushPromises()
    await answerQuestions({ ...KEY, batchId: "id-3", answers: [{ questionId: "id-3-1", pickedLabels: ["Deny"], text: "Use nx." }] }, context)

    const response = await responding
    expect(response.json()).toStrictEqual({
      hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "deny", message: "The reviewer denied this. Use nx." } },
    })
    await server.close()
  })

  it("makes no decision for a session Flight Plan did not start", async () => {
    const server = await buildServer({}, createConversationContext().context)

    const response = await server.inject({
      method: "POST",
      url: "/api/agent-hooks/permission-request",
      payload: { session_id: "unknown", tool_name: "Bash" },
    })

    expect(response.json()).toStrictEqual({})
    await server.close()
  })
})

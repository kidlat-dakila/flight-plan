import { createMockProcedureContext } from "@/procedures/context"
import { getChat } from "@/procedures/get-chat"
import { sendChatMessage } from "@/procedures/send-chat-message"

const KEY = { repositoryName: "storefront", targetId: "pr-405" }

const createContext = () => createMockProcedureContext(new Date("2026-10-01T12:00:00.000Z"))

describe("getChat and sendChatMessage", () => {
  it("has an empty conversation before any message", async () => {
    await expect(getChat(KEY, createContext())).resolves.toMatchObject({ agentState: "not-running", messages: [] })
  })

  it("stores a message with its reference, and the conversation reads it back", async () => {
    const context = createContext()

    await expect(
      sendChatMessage({ ...KEY, body: "Why here?", reference: "storefront@c81e220:src/cart/subtotal.ts#L6" }, context),
    ).resolves.toStrictEqual({ messageId: "question-1" })
    await expect(getChat(KEY, context)).resolves.toMatchObject({
      agentState: "starting",
      messages: [{ id: "question-1", reference: "storefront@c81e220:src/cart/subtotal.ts#L6" }, { isWaiting: true }],
    })
  })

  it("keeps each review target's conversation apart", async () => {
    const context = createContext()
    await sendChatMessage({ ...KEY, body: "Why here?", reference: null }, context)

    await expect(getChat({ ...KEY, targetId: "pr-412" }, context)).resolves.toMatchObject({ messages: [] })
  })
})

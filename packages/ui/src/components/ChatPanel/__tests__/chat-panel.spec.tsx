import { fireEvent, render, screen, within } from "@testing-library/react"
import ChatPanel, { type Chat } from "@/components/ChatPanel"
import { paragraph } from "@/lib/__tests__/review-samples"

const createChat = (overrides: Partial<Chat> = {}): Chat => ({
  heading: "Chat with the agent",
  agentState: "running",
  agentStateLabel: "Agent running",
  notice: "Prototype. Answers are samples, and no agent is started.",
  emptyMessage: null,
  placeholder: "Ask about this review",
  sendLabel: "Send",
  closeLabel: "Close the chat",
  messages: [
    { id: "q1", author: "reviewer", authorLabel: "You", reference: "storefront@abc:src/a.ts#L3", body: paragraph("Why here?"), timeLabel: "just now", isWaiting: false },
    { id: "q1-answer", author: "agent", authorLabel: "Agent", reference: null, body: [], timeLabel: "Working on it", isWaiting: true },
  ],
  ...overrides,
})

const renderPanel = (chat: Chat, handlers: { onSend?: (body: string) => void, onClose?: () => void, onClearReference?: () => void } = {}, reference: string | null = null) =>
  render(
    <ChatPanel
      chat={chat}
      reference={reference}
      isSending={false}
      onSend={handlers.onSend ?? vi.fn()}
      onClearReference={handlers.onClearReference ?? vi.fn()}
      onClose={handlers.onClose ?? vi.fn()}
    />,
  )

describe("ChatPanel", () => {
  it("shows the agent's state, the notice and the conversation with what each message refers to", () => {
    renderPanel(createChat())

    const panel = screen.getByRole("complementary", { name: "Chat with the agent" })

    expect(within(panel).getByText("Agent running")).toBeTruthy()
    expect(within(panel).getByText("Prototype. Answers are samples, and no agent is started.")).toBeTruthy()
    expect(within(panel).getByText("Why here?")).toBeTruthy()
    expect(within(panel).getByText("storefront@abc:src/a.ts#L3")).toBeTruthy()
    expect(within(panel).getByText("Working on it")).toBeTruthy()
  })

  it("invites a first question when the conversation is empty", () => {
    renderPanel(createChat({ agentState: "not-running", agentStateLabel: "Agent not running", emptyMessage: "Ask about this review.", messages: [] }))

    expect(screen.getByText("Ask about this review.")).toBeTruthy()
    expect(screen.getByText("Agent not running")).toBeTruthy()
  })

  it("sends what is typed and clears the box, and cannot send nothing", () => {
    const onSend = vi.fn()
    renderPanel(createChat(), { onSend })
    const box = screen.getByRole("textbox", { name: "Ask about this review" })

    expect(screen.getByRole("button", { name: "Send" })).toHaveProperty("disabled", true)

    fireEvent.change(box, { target: { value: "And the hold?" } })
    fireEvent.click(screen.getByRole("button", { name: "Send" }))

    expect(onSend).toHaveBeenCalledWith("And the hold?")
    expect(box).toHaveProperty("value", "")
  })

  it("shows the code attached to the next question, and lets the reviewer remove it", () => {
    const onClearReference = vi.fn()
    renderPanel(createChat({ messages: [] }), { onClearReference }, "storefront@abc:src/b.ts#L9")

    expect(screen.getByText("storefront@abc:src/b.ts#L9")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Remove the reference" }))

    expect(onClearReference).toHaveBeenCalledTimes(1)
  })

  it("reports a close", () => {
    const onClose = vi.fn()
    renderPanel(createChat(), { onClose })

    fireEvent.click(screen.getByRole("button", { name: "Close the chat" }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

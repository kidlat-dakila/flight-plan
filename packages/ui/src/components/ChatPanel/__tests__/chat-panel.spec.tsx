import { fireEvent, render, screen, within } from "@testing-library/react"
import ChatPanel, { type Conversation, type ModelChoice, type QuestionAnswering } from "@/components/ChatPanel"
import { paragraph } from "@/lib/__tests__/review-samples"
import type { CodeLinkTargets } from "@/lib/review-content"

const NOT_ANSWERING: QuestionAnswering = { pendingBatchId: null, rejection: null }

const createConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  heading: "Chat with the agent",
  closeLabel: "Close the chat",
  emptyMessage: null,
  placeholder: "Ask about this review",
  sendLabel: "Send",
  agentState: "working",
  agentStateLabel: "Agent working",
  problem: null,
  entries: [
    { kind: "message", id: "m1", author: "reviewer", authorLabel: "You", reference: "storefront@abc:src/a.ts#L3", body: paragraph("Why here?"), timeLabel: "just now" },
    { kind: "message", id: "a1", author: "agent", authorLabel: "Agent", reference: null, body: paragraph("It guards the call."), timeLabel: "just now" },
  ],
  ...overrides,
})

const MODEL_CHOICE: ModelChoice = {
  label: "Model for Claude",
  hint: "The agent uses it from its next turn.",
  selectedModel: "opus",
  options: [{ value: "opus", label: "Opus" }, { value: "haiku", label: "Haiku" }],
}

interface PanelOptions {
  readonly reference?: string | null
  readonly modelChoice?: ModelChoice | null
  readonly sendProblem?: string | null
  readonly onSend?: (body: string) => void
  readonly onChooseModel?: (model: string) => void
  readonly onClose?: () => void
  readonly onClearReference?: () => void
  readonly codeLinks?: CodeLinkTargets
  readonly onOpenCodeLink?: (anchorId: string) => void
}

const renderPanel = (conversation: Conversation, options: PanelOptions = {}) =>
  render(
    <ChatPanel
      conversation={conversation}
      modelChoice={options.modelChoice ?? null}
      codeLinks={options.codeLinks ?? {}}
      reference={options.reference ?? null}
      isSending={false}
      sendProblem={options.sendProblem ?? null}
      answering={NOT_ANSWERING}
      onSend={options.onSend ?? vi.fn()}
      onAnswer={vi.fn()}
      onChooseModel={options.onChooseModel ?? vi.fn()}
      onClearReference={options.onClearReference ?? vi.fn()}
      onOpenCodeLink={options.onOpenCodeLink ?? vi.fn()}
      onClose={options.onClose ?? vi.fn()}
    />,
  )

describe("ChatPanel", () => {
  it("shows the agent's state and the conversation with what each message refers to", () => {
    renderPanel(createConversation())

    const panel = screen.getByRole("complementary", { name: "Chat with the agent" })

    expect(within(panel).getByRole("status").textContent).toBe("Agent working")
    expect(within(panel).getByText("Why here?")).toBeTruthy()
    expect(within(panel).getByText("It guards the call.")).toBeTruthy()
    expect(within(panel).getByText("storefront@abc:src/a.ts#L3")).toBeTruthy()
  })

  it("invites a first message when the conversation is empty", () => {
    renderPanel(createConversation({ agentState: "not-running", agentStateLabel: "Agent not running", emptyMessage: "Ask about this review.", entries: [] }))

    expect(screen.getByText("Ask about this review.")).toBeTruthy()
    expect(screen.getByText("Agent not running")).toBeTruthy()
  })

  it("says why the agent could not start", () => {
    renderPanel(createConversation({ agentState: "failed", agentStateLabel: "Agent could not start", problem: "The claude command was not found." }))

    expect(screen.getByRole("alert").textContent).toBe("The claude command was not found.")
  })

  it("sends what is typed and clears the box, and cannot send nothing", () => {
    const onSend = vi.fn()
    renderPanel(createConversation(), { onSend })
    const box = screen.getByRole("textbox", { name: "Ask about this review" })

    expect(screen.getByRole("button", { name: "Send" })).toHaveProperty("disabled", true)

    fireEvent.change(box, { target: { value: "And the hold?" } })
    fireEvent.click(screen.getByRole("button", { name: "Send" }))

    expect(onSend).toHaveBeenCalledWith("And the hold?")
    expect(box).toHaveProperty("value", "")
  })

  it("shows why a message was not sent", () => {
    renderPanel(createConversation(), { sendProblem: "Flight Plan has no repository named \"billing\"." })

    expect(screen.getByRole("alert").textContent).toBe("Flight Plan has no repository named \"billing\".")
  })

  it("shows the code attached to the next message, and lets the reviewer remove it", () => {
    const onClearReference = vi.fn()
    renderPanel(createConversation({ entries: [] }), { onClearReference, reference: "storefront@abc:src/b.ts#L9" })

    expect(screen.getByText("storefront@abc:src/b.ts#L9")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Remove the reference" }))

    expect(onClearReference).toHaveBeenCalledTimes(1)
  })

  it("lets the reviewer switch the agent's model", () => {
    const onChooseModel = vi.fn()
    renderPanel(createConversation(), { modelChoice: MODEL_CHOICE, onChooseModel })
    const select = screen.getByRole<HTMLSelectElement>("combobox", { name: "Model for Claude" })

    expect(select.value).toBe("opus")
    expect(screen.getByText("The agent uses it from its next turn.")).toBeTruthy()

    fireEvent.change(select, { target: { value: "haiku" } })

    expect(onChooseModel).toHaveBeenCalledWith("haiku")
  })

  it("draws the agent's questions among the messages", () => {
    renderPanel(createConversation({
      entries: [{
        kind: "questions",
        id: "q1",
        isPermission: false,
        heading: "The agent asks a question",
        timeLabel: "just now",
        status: "open",
        statusLabel: "Waiting for your answer",
        submitLabel: "Send your answer",
        questions: [{ id: "q1-1", prompt: "Which order?", detail: null, allowsMultiple: false, options: [], textLabel: "Your answer", answerLabel: null }],
      }],
    }))

    expect(screen.getByRole("region", { name: "The agent asks a question" })).toBeTruthy()
  })

  it("draws a code link in a message and reports its anchor when opened", () => {
    const onOpenCodeLink = vi.fn()
    const codeLinks: CodeLinkTargets = {
      "src/price.ts#priceOf": { pathLabel: "src/price.ts", rangeLabel: "L4-9", lines: [], anchorId: "waypoint-price-of", forgeLink: null },
    }
    renderPanel(
      createConversation({
        entries: [{
          kind: "message",
          id: "a1",
          author: "agent",
          authorLabel: "Agent",
          reference: null,
          body: [{ kind: "paragraph", inlines: [{ kind: "code-link", text: "priceOf()", isCode: true, linkId: "src/price.ts#priceOf" }] }],
          timeLabel: "just now",
        }],
      }),
      { codeLinks, onOpenCodeLink },
    )

    fireEvent.click(screen.getByRole("link", { name: "priceOf()" }))

    expect(onOpenCodeLink).toHaveBeenCalledWith("waypoint-price-of")
  })

  it("reports a close", () => {
    const onClose = vi.fn()
    renderPanel(createConversation(), { onClose })

    fireEvent.click(screen.getByRole("button", { name: "Close the chat" }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

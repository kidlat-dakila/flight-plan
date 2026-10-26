import { fireEvent, render, screen, within } from "@testing-library/react"
import ChatPanel, { type Conversation, type Excerpt, type ModelChoice, type QuestionAnswering } from "@/components/ChatPanel"
import { paragraph } from "@/lib/__tests__/review-samples"
import type { CodeLinkTargets } from "@/lib/review-content"

const NOT_ANSWERING: QuestionAnswering = { pendingBatchId: null, rejection: null }

const createConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  heading: "Chat with the agent",
  closeLabel: "Hide chat",
  emptyMessage: null,
  placeholder: "Ask about this review",
  sendLabel: "Send",
  agentState: "online",
  agentStateLabel: "Agent online",
  entries: [
    { kind: "message", id: "m1", author: "reviewer", authorLabel: "You", reference: "storefront@abc:src/a.ts#L3", excerpt: null, body: paragraph("Why here?"), timeLabel: "just now" },
    { kind: "message", id: "a1", author: "agent", authorLabel: "Agent", reference: null, excerpt: null, body: paragraph("It guards the call."), timeLabel: "just now" },
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
  readonly excerpt?: Excerpt | null
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
      excerpt={options.excerpt ?? null}
      isSending={false}
      sendProblem={options.sendProblem ?? null}
      answering={NOT_ANSWERING}
      onSend={options.onSend ?? vi.fn()}
      onAnswer={vi.fn()}
      onChooseModel={options.onChooseModel ?? vi.fn()}
      onClearReference={options.onClearReference ?? vi.fn()}
      onOpenCodeLink={options.onOpenCodeLink ?? vi.fn()}
      hideShortcutLabel="Ctrl+C"
      onClose={options.onClose ?? vi.fn()}
    />,
  )

describe("ChatPanel", () => {
  it("shows the agent's state and the conversation with what each message refers to", () => {
    renderPanel(createConversation())

    const panel = screen.getByRole("complementary", { name: "Chat with the agent" })

    expect(within(panel).getByRole("status").textContent).toBe("Agent online")
    expect(within(panel).getByText("Why here?")).toBeTruthy()
    expect(within(panel).getByText("It guards the call.")).toBeTruthy()
    expect(within(panel).getByText("storefront@abc:src/a.ts#L3")).toBeTruthy()
  })

  it("invites a first message when the conversation is empty", () => {
    renderPanel(createConversation({ agentState: "offline", agentStateLabel: "Agent offline", emptyMessage: "Ask about this review.", entries: [] }))

    expect(screen.getByText("Ask about this review.")).toBeTruthy()
    expect(screen.getByText("Agent offline")).toBeTruthy()
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

  it("shows the highlighted code attached to the next message in place of its reference", () => {
    renderPanel(createConversation({ entries: [] }), {
      reference: "storefront@abc:src/b.ts#L9-10",
      excerpt: { kind: "code", text: "const total = 1\nreturn total" },
    })

    const excerpt = screen.getByText(/const total = 1/)

    expect(excerpt.textContent).toBe("const total = 1\nreturn total")
    expect(excerpt.getAttribute("title")).toBe("storefront@abc:src/b.ts#L9-10")
    expect(screen.queryByText("storefront@abc:src/b.ts#L9-10")).toBeNull()
    expect(screen.getByRole("button", { name: "Remove the reference" })).toBeTruthy()
  })

  it("shows the highlighted text attached to the next message as a quote", () => {
    renderPanel(createConversation({ entries: [] }), {
      reference: "storefront@abc:waypoint price-of \"The hold\"",
      excerpt: { kind: "text", text: "The hold is released on cancel." },
    })

    expect(screen.getByText("The hold is released on cancel.").tagName).toBe("BLOCKQUOTE")
  })

  it("shows the highlighted text of a sent message in place of its reference", () => {
    renderPanel(createConversation({
      entries: [{
        kind: "message",
        id: "m2",
        author: "reviewer",
        authorLabel: "You",
        reference: "storefront@abc:src/c.ts#L2",
        excerpt: { kind: "code", text: "holdStock(cart)" },
        body: paragraph("Is this awaited?"),
        timeLabel: "just now",
      }],
    }))

    expect(screen.getByText("holdStock(cart)")).toBeTruthy()
    expect(screen.queryByText("storefront@abc:src/c.ts#L2")).toBeNull()
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
          excerpt: null,
          body: [{ kind: "paragraph", inlines: [{ kind: "code-link", text: "priceOf()", isCode: true, linkId: "src/price.ts#priceOf" }] }],
          timeLabel: "just now",
        }],
      }),
      { codeLinks, onOpenCodeLink },
    )

    fireEvent.click(screen.getByRole("link", { name: "priceOf()" }))

    expect(onOpenCodeLink).toHaveBeenCalledWith("waypoint-price-of")
  })

  it("reports that the chat is hidden", () => {
    const onClose = vi.fn()
    renderPanel(createConversation(), { onClose })

    fireEvent.click(screen.getByRole("button", { name: "Hide chat" }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

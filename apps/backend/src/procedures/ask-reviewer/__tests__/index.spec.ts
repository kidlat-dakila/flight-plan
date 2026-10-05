import { askReviewer } from "@/procedures/ask-reviewer"
import { deliverToAgent } from "@/procedures/deliver-to-agent"
import { createConversationContext, KEY, reviewerMessage } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"

const QUESTIONS = [
  { prompt: "How should I organise it?", options: [{ label: "By feature", description: "" }, { label: "By layer", description: "" }], allowsMultiple: false },
  { prompt: "Anything to skip?", options: [], allowsMultiple: false },
]

describe("askReviewer", () => {
  it("shows the batch to the reviewer and gives a session the reviewer started the command that waits for the answers", async () => {
    const { context, environment } = createConversationContext()

    const asking = await askReviewer({ ...KEY, questions: QUESTIONS }, context)

    expect(asking).toMatchObject({ kind: "asked", batchId: "id-1" })
    expect(asking.kind === "asked" ? asking.note : "").toContain("curl -sN \"http://localhost:3000/api/storefront/pr-412/live/agent\"")
    const { journal } = await environment.store.read(KEY)
    expect(journal[0]?.event).toMatchObject({ kind: "question-batch", origin: "agent", questions: [{ id: "id-1-1" }, { id: "id-1-2" }] })
  })

  it("tells a session Flight Plan started to end its turn", async () => {
    const { context, environment } = createConversationContext()
    await environment.store.append(KEY, [reviewerMessage("m1", "Hi")])
    await deliverToAgent(KEY, context)

    const asking = await askReviewer({ ...KEY, questions: QUESTIONS }, context)

    expect(asking.kind === "asked" ? asking.note : "").toContain("End your turn now.")
  })

  it("rejects options that share a label and keeps nothing", async () => {
    const { context, environment } = createConversationContext()
    const questions = [{ prompt: "Which?", options: [{ label: "A", description: "" }, { label: "A", description: "" }], allowsMultiple: false }]

    await expect(askReviewer({ ...KEY, questions }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Give every option a different label in: Which?",
    })
    await expect(environment.store.read(KEY)).resolves.toMatchObject({ journal: [] })
  })
})

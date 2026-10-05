import { planAnswers } from "@/procedures/answer-questions/utils/plan-answers"
import { agentQuestion } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import type { QuestionBatch } from "@/procedures/get-conversation/utils/conversation"

const choiceBatch = agentQuestion("q1")

const mixedBatch: QuestionBatch = {
  ...choiceBatch,
  questions: [
    ...choiceBatch.questions,
    { id: "q1-2", prompt: "Anything to skip?", detail: null, options: [], allowsMultiple: false },
    {
      id: "q1-3",
      prompt: "Which areas?",
      detail: null,
      options: [{ label: "API", description: "" }, { label: "UI", description: "" }],
      allowsMultiple: true,
    },
  ],
}

const OPEN = { batch: mixedBatch, isSettled: false }

describe("planAnswers", () => {
  it("accepts one answer per question, in the order the agent asked them, with blank text dropped", () => {
    const plan = planAnswers(OPEN, [
      { questionId: "q1-3", pickedLabels: ["API", "UI"], text: "  " },
      { questionId: "q1-1", pickedLabels: ["By layer"], text: null },
      { questionId: "q1-2", pickedLabels: [], text: " The lockfile " },
    ])

    expect(plan).toStrictEqual({
      kind: "accepted",
      batch: mixedBatch,
      answers: [
        { questionId: "q1-1", pickedLabels: ["By layer"], text: null },
        { questionId: "q1-2", pickedLabels: [], text: "The lockfile" },
        { questionId: "q1-3", pickedLabels: ["API", "UI"], text: null },
      ],
    })
  })

  it("accepts the reviewer's own words in place of an option", () => {
    const plan = planAnswers({ batch: choiceBatch, isSettled: false }, [{ questionId: "q1-1", pickedLabels: [], text: "By risk" }])

    expect(plan).toMatchObject({ kind: "accepted" })
  })

  it("rejects a question left without an answer, and names it", () => {
    expect(planAnswers(OPEN, [{ questionId: "q1-1", pickedLabels: ["By layer"], text: null }])).toStrictEqual({
      kind: "rejected",
      message: "Write an answer to: Anything to skip?",
      questionId: "q1-2",
    })
  })

  it("rejects several picks on a single-pick question and a pick that was not offered", () => {
    const answers = [
      { questionId: "q1-2", pickedLabels: [], text: "No" },
      { questionId: "q1-3", pickedLabels: ["API"], text: null },
    ]

    expect(planAnswers(OPEN, [{ questionId: "q1-1", pickedLabels: ["By layer", "By feature"], text: null }, ...answers])).toMatchObject({
      kind: "rejected",
      message: "Pick one option for: How should I organise the walkthrough?",
    })
    expect(planAnswers(OPEN, [{ questionId: "q1-1", pickedLabels: ["By mood"], text: null }, ...answers])).toMatchObject({
      kind: "rejected",
      questionId: "q1-1",
    })
  })

  it("rejects answers to a batch that is missing, closed, unknown or answered twice", () => {
    const answer = { questionId: "q1-1", pickedLabels: ["By layer"], text: null }

    expect(planAnswers({ batch: null, isSettled: false }, [answer])).toMatchObject({ message: "The agent did not ask these questions." })
    expect(planAnswers({ batch: choiceBatch, isSettled: true }, [answer])).toMatchObject({ kind: "rejected" })
    expect(planAnswers(OPEN, [{ ...answer, questionId: "q9-1" }])).toMatchObject({ questionId: "q9-1" })
    expect(planAnswers(OPEN, [answer, answer])).toMatchObject({ message: "Answer each question once." })
  })
})

import { planQuestionBatch } from "@/procedures/ask-reviewer/utils/plan-question-batch"

describe("planQuestionBatch", () => {
  it("numbers the questions under the batch and keeps multiple picks only where there are options", () => {
    expect(
      planQuestionBatch("b1", [
        { prompt: "Which order?", options: [{ label: "A", description: "" }], allowsMultiple: true },
        { prompt: "Anything else?", options: [], allowsMultiple: true },
      ]),
    ).toStrictEqual({
      kind: "accepted",
      questions: [
        { id: "b1-1", prompt: "Which order?", detail: null, options: [{ label: "A", description: "" }], allowsMultiple: true },
        { id: "b1-2", prompt: "Anything else?", detail: null, options: [], allowsMultiple: false },
      ],
    })
  })

  it("rejects options that share a label, since the answer names the option by its label", () => {
    expect(
      planQuestionBatch("b1", [{ prompt: "Which?", options: [{ label: "A", description: "" }, { label: "A", description: "x" }], allowsMultiple: false }]),
    ).toStrictEqual({ kind: "rejected", message: "Give every option a different label in: Which?" })
  })
})

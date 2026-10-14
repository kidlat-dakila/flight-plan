import { fireEvent, render, screen, within } from "@testing-library/react"
import QuestionBatch, { type Questions } from "@/components/QuestionBatch"

const BATCH: Questions = {
  kind: "questions",
  id: "q1",
  isPermission: false,
  heading: "The agent asks 2 questions",
  timeLabel: "just now",
  status: "open",
  statusLabel: "Waiting for your answer",
  submitLabel: "Send your answers",
  questions: [
    {
      id: "q1-1",
      prompt: "How should I organise the walkthrough?",
      detail: null,
      allowsMultiple: false,
      options: [
        { label: "By feature", description: "One segment per feature." },
        { label: "By layer", description: "One segment per layer." },
      ],
      textLabel: "Your own answer",
      answerLabel: null,
    },
    {
      id: "q1-2",
      prompt: "Which files matter most?",
      detail: null,
      allowsMultiple: true,
      options: [
        { label: "cart.ts", description: "" },
        { label: "checkout.ts", description: "" },
      ],
      textLabel: "Your own answer",
      answerLabel: null,
    },
  ],
}

const PERMISSION: Questions = {
  ...BATCH,
  id: "p1",
  isPermission: true,
  heading: "The agent asks for permission",
  submitLabel: "Send",
  questions: [{
    id: "p1-1",
    prompt: "Allow the agent to use Bash?",
    detail: "pnpm test",
    allowsMultiple: false,
    options: [
      { label: "Allow", description: "Let the agent run it this time." },
      { label: "Deny", description: "Refuse, and tell the agent why if you write an answer." },
    ],
    textLabel: "Why, for the agent (optional)",
    answerLabel: null,
  }],
}

describe("QuestionBatch", () => {
  it("sends one pick, several picks and the reviewer's own words for each question", () => {
    const onAnswer = vi.fn()
    render(<QuestionBatch batch={BATCH} isAnswering={false} problem={null} onAnswer={onAnswer} />)
    const first = screen.getByRole("group", { name: "How should I organise the walkthrough?" })
    const second = screen.getByRole("group", { name: "Which files matter most?" })

    fireEvent.click(within(first).getByRole("radio", { name: /By feature/ }))
    fireEvent.click(within(first).getByRole("radio", { name: /By layer/ }))
    fireEvent.change(within(first).getByRole("textbox", { name: "Your own answer" }), { target: { value: "API first" } })
    fireEvent.click(within(second).getByRole("checkbox", { name: "cart.ts" }))
    fireEvent.click(within(second).getByRole("checkbox", { name: "checkout.ts" }))
    fireEvent.click(screen.getByRole("button", { name: "Send your answers" }))

    expect(onAnswer).toHaveBeenCalledWith([
      { questionId: "q1-1", pickedLabels: ["By layer"], text: "API first" },
      { questionId: "q1-2", pickedLabels: ["cart.ts", "checkout.ts"], text: null },
    ])
  })

  it("shows what a permission request would run, with Allow and Deny", () => {
    const onAnswer = vi.fn()
    render(<QuestionBatch batch={PERMISSION} isAnswering={false} problem={null} onAnswer={onAnswer} />)

    expect(screen.getByText("pnpm test")).toBeTruthy()

    fireEvent.click(screen.getByRole("radio", { name: /Allow/ }))
    fireEvent.click(screen.getByRole("button", { name: "Send" }))

    expect(onAnswer).toHaveBeenCalledWith([{ questionId: "p1-1", pickedLabels: ["Allow"], text: null }])
  })

  it("shows why the answers were refused, and holds the button while they are sent", () => {
    render(<QuestionBatch batch={BATCH} isAnswering problem="Pick one option for: Which order?" onAnswer={vi.fn()} />)

    expect(screen.getByRole("alert").textContent).toBe("Pick one option for: Which order?")
    expect(screen.getByRole("button", { name: "Send your answers" })).toHaveProperty("disabled", true)
  })

  it("shows the answer of a settled question and no form", () => {
    const answered: Questions = {
      ...BATCH,
      status: "answered",
      statusLabel: "Answered",
      questions: BATCH.questions.map((question, position) => ({ ...question, answerLabel: position === 0 ? "By layer; API first" : null })),
    }
    render(<QuestionBatch batch={answered} isAnswering={false} problem={null} onAnswer={vi.fn()} />)

    expect(screen.getByText("Answered")).toBeTruthy()
    expect(screen.getByText("By layer; API first")).toBeTruthy()
    expect(screen.getByText("No answer")).toBeTruthy()
    expect(screen.queryByRole("button")).toBeNull()
  })
})

import type { Answer, Question, QuestionBatch } from "@/procedures/get-conversation/utils/conversation"
import type { AnswerQuestionsInput } from "./schemas"

type GivenAnswer = AnswerQuestionsInput["answers"][number]

export type AnswersPlan
  = | { readonly kind: "accepted", readonly batch: QuestionBatch, readonly answers: readonly Answer[] }
    | { readonly kind: "rejected", readonly message: string, readonly questionId: string | null }

export interface BatchState {
  readonly batch: QuestionBatch | null
  readonly isSettled: boolean
}

const MISSING_BATCH_MESSAGE = "The agent did not ask these questions."
const SETTLED_MESSAGE = "These questions are closed. They were answered already, or the agent stopped waiting."
const UNKNOWN_QUESTION_MESSAGE = "An answer names a question the agent did not ask."
const REPEATED_ANSWER_MESSAGE = "Answer each question once."

const reject = (message: string, questionId: string | null = null): AnswersPlan => ({ kind: "rejected", message, questionId })

const normalise = (answer: GivenAnswer): Answer => {
  const text = answer.text?.trim() ?? ""
  return { questionId: answer.questionId, pickedLabels: answer.pickedLabels, text: text === "" ? null : text }
}

const problemOf = (question: Question, answer: Answer | undefined): string | null => {
  const hasText = answer?.text !== null && answer?.text !== undefined
  const picks = answer?.pickedLabels ?? []
  if (question.options.length === 0) return hasText ? null : `Write an answer to: ${question.prompt}`
  if (picks.some((label) => !question.options.some((option) => option.label === label))) {
    return `Pick from the options offered for: ${question.prompt}`
  }
  if (!question.allowsMultiple && picks.length > 1) return `Pick one option for: ${question.prompt}`
  return picks.length > 0 || hasText ? null : `Pick an option or write an answer for: ${question.prompt}`
}

const hasRepeats = (answers: readonly GivenAnswer[]): boolean =>
  new Set(answers.map((answer) => answer.questionId)).size !== answers.length

export const planAnswers = ({ batch, isSettled }: BatchState, given: readonly GivenAnswer[]): AnswersPlan => {
  if (batch === null) return reject(MISSING_BATCH_MESSAGE)
  if (isSettled) return reject(SETTLED_MESSAGE)
  if (hasRepeats(given)) return reject(REPEATED_ANSWER_MESSAGE)
  const unknown = given.find((answer) => !batch.questions.some((question) => question.id === answer.questionId))
  if (unknown !== undefined) return reject(UNKNOWN_QUESTION_MESSAGE, unknown.questionId)
  const answers = given.map(normalise)
  const problems = batch.questions.map((question) => ({
    question,
    message: problemOf(question, answers.find((answer) => answer.questionId === question.id)),
  }))
  const problem = problems.find(({ message }) => message !== null)
  if (problem !== undefined && problem.message !== null) return reject(problem.message, problem.question.id)
  return {
    kind: "accepted",
    batch,
    answers: batch.questions.flatMap((question) => answers.filter((answer) => answer.questionId === question.id)),
  }
}

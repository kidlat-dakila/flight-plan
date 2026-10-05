import type { Question } from "@/procedures/get-conversation/utils/conversation"
import type { AskedQuestion } from "./schemas"

export type QuestionsPlan
  = | { readonly kind: "accepted", readonly questions: readonly Question[] }
    | { readonly kind: "rejected", readonly message: string }

const hasRepeatedLabels = (question: AskedQuestion): boolean =>
  new Set(question.options.map((option) => option.label)).size !== question.options.length

const questionIdOf = (batchId: string, index: number): string => `${batchId}-${String(index + 1)}`

const toQuestion = (batchId: string) => (question: AskedQuestion, index: number): Question => ({
  id: questionIdOf(batchId, index),
  prompt: question.prompt,
  detail: null,
  options: question.options.map(({ label, description }) => ({ label, description })),
  allowsMultiple: question.options.length > 0 && question.allowsMultiple,
})

export const planQuestionBatch = (batchId: string, asked: readonly AskedQuestion[]): QuestionsPlan => {
  const repeated = asked.find(hasRepeatedLabels)
  return repeated === undefined
    ? { kind: "accepted", questions: asked.map(toQuestion(batchId)) }
    : { kind: "rejected", message: `Give every option a different label in: ${repeated.prompt}` }
}

import { useId, useState } from "react"
import Button from "@/components/blocks/button"
import { cn } from "@/lib/utils"

type QuestionsStatus = "open" | "answered" | "withdrawn"

export interface Questions {
  readonly kind: "questions"
  readonly id: string
  readonly isPermission: boolean
  readonly heading: string
  readonly timeLabel: string
  readonly status: QuestionsStatus
  readonly statusLabel: string
  readonly submitLabel: string
  readonly questions: readonly {
    readonly id: string
    readonly prompt: string
    readonly detail: string | null
    readonly allowsMultiple: boolean
    readonly options: readonly { readonly label: string, readonly description: string }[]
    readonly textLabel: string
    readonly answerLabel: string | null
  }[]
}

export interface GivenAnswer {
  readonly questionId: string
  readonly pickedLabels: readonly string[]
  readonly text: string | null
}

type Question = Questions["questions"][number]

interface Draft {
  readonly pickedLabels: readonly string[]
  readonly text: string
}

interface QuestionBatchProps {
  readonly batch: Questions
  readonly isAnswering: boolean
  readonly problem: string | null
  readonly onAnswer: (answers: readonly GivenAnswer[]) => void
}

const EMPTY_DRAFT: Draft = { pickedLabels: [], text: "" }
const NO_ANSWER_LABEL = "No answer"
const CHOICE_INPUT_CLASSES = "mt-0.5 size-4 shrink-0 accent-(--primary)"
const TEXTAREA_CLASSES = "min-h-12 w-full resize-none rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
const DETAIL_CLASSES = "max-h-40 overflow-auto rounded-sm bg-muted px-1.5 py-1 font-mono text-[0.6875rem] leading-4 whitespace-pre-wrap wrap-anywhere"

const STATUS_CLASSES: Record<QuestionsStatus, string> = {
  open: "font-bold text-signal-text",
  answered: "text-muted-foreground",
  withdrawn: "text-muted-foreground italic",
}

const withPick = (picked: readonly string[], label: string, question: Question, isChecked: boolean): readonly string[] => {
  if (!question.allowsMultiple) return isChecked ? [label] : []
  const others = picked.filter((candidate) => candidate !== label)
  return isChecked ? [...others, label] : others
}

const toGivenAnswer = (question: Question, draft: Draft): GivenAnswer => ({
  questionId: question.id,
  pickedLabels: draft.pickedLabels,
  text: draft.text.trim() === "" ? null : draft.text,
})

const Detail = ({ detail }: { readonly detail: string | null }) =>
  (detail === null ? null : <pre className={DETAIL_CLASSES}>{detail}</pre>)

interface OpenQuestionProps {
  readonly question: Question
  readonly draft: Draft
  readonly onDraftChange: (draft: Draft) => void
}

const OpenQuestion = ({ question, draft, onDraftChange }: OpenQuestionProps) => {
  const groupId = useId()
  const textId = useId()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-1 text-sm font-bold">{question.prompt}</legend>
      <Detail detail={question.detail} />
      {question.options.map((option) => (
        <label key={option.label} className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type={question.allowsMultiple ? "checkbox" : "radio"}
            name={groupId}
            checked={draft.pickedLabels.includes(option.label)}
            className={CHOICE_INPUT_CLASSES}
            onChange={(event) => {
              onDraftChange({ ...draft, pickedLabels: withPick(draft.pickedLabels, option.label, question, event.target.checked) })
            }}
          />
          <span className="min-w-0">
            <span className="block">{option.label}</span>
            {option.description === "" ? null : <span className="block text-xs text-muted-foreground">{option.description}</span>}
          </span>
        </label>
      ))}
      <label htmlFor={textId} className="text-xs text-muted-foreground">{question.textLabel}</label>
      <textarea
        id={textId}
        value={draft.text}
        className={TEXTAREA_CLASSES}
        onChange={(event) => { onDraftChange({ ...draft, text: event.target.value }) }}
      />
    </fieldset>
  )
}

const SettledQuestion = ({ question }: { readonly question: Question }) => (
  <div className="flex flex-col gap-1">
    <p className="text-sm font-bold">{question.prompt}</p>
    <Detail detail={question.detail} />
    <p className="text-sm">{question.answerLabel ?? NO_ANSWER_LABEL}</p>
  </div>
)

const QuestionBatch = ({ batch, isAnswering, problem, onAnswer }: QuestionBatchProps) => {
  const [drafts, setDrafts] = useState<Readonly<Record<string, Draft>>>({})
  const draftOf = (question: Question): Draft => drafts[question.id] ?? EMPTY_DRAFT
  const isOpen = batch.status === "open"
  return (
    <section
      aria-label={batch.heading}
      data-status={batch.status}
      className={cn("flex flex-col gap-3 rounded-lg border px-3 py-2.5 text-sm", isOpen ? "border-signal" : "")}
    >
      <div className="flex flex-col">
        <p className="flex items-baseline gap-2">
          <span className="font-bold">{batch.heading}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{batch.timeLabel}</span>
        </p>
        <p className={cn("text-xs", STATUS_CLASSES[batch.status])}>{batch.statusLabel}</p>
      </div>
      {isOpen
        ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                onAnswer(batch.questions.map((question) => toGivenAnswer(question, draftOf(question))))
              }}
            >
              {batch.questions.map((question) => (
                <OpenQuestion
                  key={question.id}
                  question={question}
                  draft={draftOf(question)}
                  onDraftChange={(draft) => { setDrafts((current) => ({ ...current, [question.id]: draft })) }}
                />
              ))}
              {problem === null ? null : <p role="alert" className="text-sm text-destructive">{problem}</p>}
              <Button type="submit" size="sm" disabled={isAnswering} className="self-end">{batch.submitLabel}</Button>
            </form>
          )
        : batch.questions.map((question) => <SettledQuestion key={question.id} question={question} />)}
    </section>
  )
}

export default QuestionBatch

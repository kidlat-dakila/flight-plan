import { useEffect, useRef, useState } from "react"
import Button from "@/components/blocks/button"
import IconButton from "@/components/IconButton"
import Prose from "@/components/Prose"
import QuestionBatch, { type GivenAnswer, type Questions } from "@/components/QuestionBatch"
import SelectField from "@/components/SelectField"
import type { CodeLinkTargets, ProseBlocks } from "@/lib/review-content"
import { cn } from "@/lib/utils"

type AgentState = "not-running" | "starting" | "working" | "waiting-for-reviewer" | "listening" | "failed"

interface Message {
  readonly kind: "message"
  readonly id: string
  readonly author: "reviewer" | "agent"
  readonly authorLabel: string
  readonly reference: string | null
  readonly body: ProseBlocks
  readonly timeLabel: string
}

export interface Conversation {
  readonly heading: string
  readonly closeLabel: string
  readonly emptyMessage: string | null
  readonly placeholder: string
  readonly sendLabel: string
  readonly agentState: AgentState
  readonly agentStateLabel: string
  readonly problem: string | null
  readonly entries: readonly (Message | Questions)[]
}

export interface ModelChoice {
  readonly label: string
  readonly hint: string
  readonly selectedModel: string
  readonly options: readonly { readonly value: string, readonly label: string }[]
}

export interface QuestionAnswering {
  readonly pendingBatchId: string | null
  readonly rejection: { readonly batchId: string, readonly message: string } | null
}

interface ChatPanelProps {
  readonly conversation: Conversation
  readonly modelChoice: ModelChoice | null
  readonly codeLinks: CodeLinkTargets
  readonly reference: string | null
  readonly isSending: boolean
  readonly sendProblem: string | null
  readonly answering: QuestionAnswering
  readonly onSend: (body: string) => void
  readonly onAnswer: (batchId: string, answers: readonly GivenAnswer[]) => void
  readonly onChooseModel: (model: string) => void
  readonly onClearReference: () => void
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onClose: () => void
}

const REMOVE_REFERENCE_LABEL = "Remove the reference"
const TEXTAREA_CLASSES = "min-h-16 w-full resize-none rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
const REFERENCE_CLASSES = "self-start rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] leading-4 wrap-anywhere"

const STATE_RING_CLASSES: Record<AgentState, string> = {
  "not-running": "fill-background stroke-muted-foreground [stroke-width:2]",
  "starting": "fill-background stroke-(--line) [stroke-dasharray:3_2.5] [stroke-width:2] motion-safe:animate-pulse",
  "working": "fill-(--line) stroke-(--line) [stroke-width:2]",
  "waiting-for-reviewer": "fill-signal stroke-signal [stroke-width:2]",
  "listening": "fill-background stroke-(--line) [stroke-width:2]",
  "failed": "fill-background stroke-destructive [stroke-width:2]",
}

interface MessageEntryProps {
  readonly message: Message
  readonly codeLinks: CodeLinkTargets
  readonly onOpenCodeLink: (anchorId: string) => void
}

const MessageEntry = ({ message, codeLinks, onOpenCodeLink }: MessageEntryProps) => (
  <>
    <p className="flex items-baseline gap-2">
      <span className="font-bold">{message.authorLabel}</span>
      <span className="text-xs text-muted-foreground tabular-nums">{message.timeLabel}</span>
    </p>
    {message.reference === null ? null : <p className={REFERENCE_CLASSES}>{message.reference}</p>}
    <Prose blocks={message.body} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
  </>
)

const ChatPanel = ({
  conversation,
  modelChoice,
  codeLinks,
  reference,
  isSending,
  sendProblem,
  answering,
  onSend,
  onAnswer,
  onChooseModel,
  onClearReference,
  onOpenCodeLink,
  onClose,
}: ChatPanelProps) => {
  const [body, setBody] = useState("")
  const entriesRef = useRef<HTMLOListElement>(null)
  const latestEntryId = conversation.entries.at(-1)?.id ?? null
  const hasModelChoice = modelChoice !== null
  useEffect(() => {
    const list = entriesRef.current
    list?.scrollTo({ top: list.scrollHeight })
  }, [latestEntryId, hasModelChoice])
  const send = (): void => {
    onSend(body)
    setBody("")
  }
  return (
    <aside
      aria-label={conversation.heading}
      className="fixed top-14 right-0 bottom-0 z-30 flex w-(--chat-width) flex-col border-l bg-background duration-200 ease-out animate-in slide-in-from-right-8"
    >
      <div className="flex items-start gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base leading-6 font-bold">{conversation.heading}</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg aria-hidden="true" viewBox="0 0 12 12" data-state={conversation.agentState} className="size-3">
              <circle cx="6" cy="6" r="4" className={cn("transition-[fill,stroke] duration-[180ms] ease-out", STATE_RING_CLASSES[conversation.agentState])} />
            </svg>
            <span role="status">{conversation.agentStateLabel}</span>
          </p>
        </div>
        <IconButton icon="close" label={conversation.closeLabel} onClick={onClose} />
      </div>
      {conversation.problem === null
        ? null
        : <p role="alert" className="max-h-24 overflow-y-auto border-b px-4 py-2 text-xs text-destructive">{conversation.problem}</p>}
      {modelChoice === null
        ? null
        : (
            <div className="flex flex-col gap-1 border-b px-4 py-2">
              <SelectField
                label={modelChoice.label}
                options={modelChoice.options}
                value={modelChoice.selectedModel}
                onChange={onChooseModel}
              />
              <p className="text-xs text-muted-foreground">{modelChoice.hint}</p>
            </div>
          )}
      <ol ref={entriesRef} aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {conversation.emptyMessage === null ? null : <li className="text-sm text-muted-foreground">{conversation.emptyMessage}</li>}
        {conversation.entries.map((entry) => (
          <li key={entry.id} data-author={entry.kind === "message" ? entry.author : undefined} className="flex flex-col gap-1 text-sm">
            {entry.kind === "message"
              ? <MessageEntry message={entry} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
              : (
                  <QuestionBatch
                    batch={entry}
                    isAnswering={answering.pendingBatchId === entry.id}
                    problem={answering.rejection?.batchId === entry.id ? answering.rejection.message : null}
                    onAnswer={(answers) => { onAnswer(entry.id, answers) }}
                  />
                )}
          </li>
        ))}
      </ol>
      <form
        className="flex flex-col gap-2 border-t px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        {reference === null
          ? null
          : (
              <p className="flex items-start gap-1">
                <span className={cn(REFERENCE_CLASSES, "flex-1")}>{reference}</span>
                <IconButton icon="close" label={REMOVE_REFERENCE_LABEL} className="size-5" onClick={onClearReference} />
              </p>
            )}
        <textarea
          aria-label={conversation.placeholder}
          placeholder={conversation.placeholder}
          value={body}
          className={TEXTAREA_CLASSES}
          onChange={(event) => { setBody(event.target.value) }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || body.trim() === "") return
            event.preventDefault()
            send()
          }}
        />
        {sendProblem === null ? null : <p role="alert" className="text-xs text-destructive">{sendProblem}</p>}
        <Button type="submit" size="sm" disabled={isSending || body.trim() === ""} className="self-end">{conversation.sendLabel}</Button>
      </form>
    </aside>
  )
}

export default ChatPanel

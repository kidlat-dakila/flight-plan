import { useState } from "react"
import Button from "@/components/blocks/button"
import IconButton from "@/components/IconButton"
import Prose from "@/components/Prose"
import type { ProseBlocks } from "@/lib/review-content"
import { cn } from "@/lib/utils"

type AgentState = "not-running" | "starting" | "running"

export interface Chat {
  readonly heading: string
  readonly agentState: AgentState
  readonly agentStateLabel: string
  readonly notice: string
  readonly emptyMessage: string | null
  readonly placeholder: string
  readonly sendLabel: string
  readonly closeLabel: string
  readonly messages: readonly {
    readonly id: string
    readonly author: "reviewer" | "agent"
    readonly authorLabel: string
    readonly reference: string | null
    readonly body: ProseBlocks
    readonly timeLabel: string
    readonly isWaiting: boolean
  }[]
}

interface ChatPanelProps {
  readonly chat: Chat
  readonly reference: string | null
  readonly isSending: boolean
  readonly onSend: (body: string) => void
  readonly onClearReference: () => void
  readonly onClose: () => void
}

const NO_CODE_LINKS = {}
const TEXTAREA_CLASSES = "min-h-16 w-full resize-none rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
const REFERENCE_CLASSES = "self-start rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] leading-4 wrap-anywhere"

const STATE_RING_CLASSES: Record<AgentState, string> = {
  "not-running": "fill-background stroke-muted-foreground [stroke-width:2]",
  "starting": "fill-background stroke-(--line) [stroke-dasharray:3_2.5] [stroke-width:2] motion-safe:animate-pulse",
  "running": "fill-(--line) stroke-(--line) [stroke-width:2]",
}

const ignoreCodeLink = (): void => undefined

const ChatPanel = ({ chat, reference, isSending, onSend, onClearReference, onClose }: ChatPanelProps) => {
  const [body, setBody] = useState("")
  return (
    <aside
      aria-label={chat.heading}
      className="fixed top-14 right-0 bottom-0 z-30 flex w-(--chat-width) flex-col border-l bg-background duration-200 ease-out animate-in slide-in-from-right-8"
    >
      <div className="flex items-start gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base leading-6 font-bold">{chat.heading}</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg aria-hidden="true" viewBox="0 0 12 12" data-state={chat.agentState} className="size-3">
              <circle cx="6" cy="6" r="4" className={cn("transition-[fill,stroke] duration-[180ms] ease-out", STATE_RING_CLASSES[chat.agentState])} />
            </svg>
            <span role="status">{chat.agentStateLabel}</span>
          </p>
        </div>
        <IconButton icon="close" label={chat.closeLabel} onClick={onClose} />
      </div>
      <p className="border-b px-4 py-2 text-xs text-muted-foreground">{chat.notice}</p>
      <ol aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {chat.emptyMessage === null ? null : <li className="text-sm text-muted-foreground">{chat.emptyMessage}</li>}
        {chat.messages.map((message) => (
          <li key={message.id} data-author={message.author} className="flex flex-col gap-1 text-sm">
            <p className="flex items-baseline gap-2">
              <span className="font-bold">{message.authorLabel}</span>
              <span className={cn("text-xs text-muted-foreground tabular-nums", message.isWaiting ? "motion-safe:animate-pulse" : "")}>
                {message.timeLabel}
              </span>
            </p>
            {message.reference === null ? null : <p className={REFERENCE_CLASSES}>{message.reference}</p>}
            <Prose blocks={message.body} codeLinks={NO_CODE_LINKS} onOpenCodeLink={ignoreCodeLink} />
          </li>
        ))}
      </ol>
      <form
        className="flex flex-col gap-2 border-t px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault()
          onSend(body)
          setBody("")
        }}
      >
        {reference === null
          ? null
          : (
              <p className="flex items-start gap-1">
                <span className={cn(REFERENCE_CLASSES, "flex-1")}>{reference}</span>
                <IconButton icon="close" label="Remove the reference" className="size-5" onClick={onClearReference} />
              </p>
            )}
        <textarea
          aria-label={chat.placeholder}
          placeholder={chat.placeholder}
          value={body}
          className={TEXTAREA_CLASSES}
          onChange={(event) => { setBody(event.target.value) }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || body.trim() === "") return
            event.preventDefault()
            onSend(body)
            setBody("")
          }}
        />
        <Button type="submit" size="sm" disabled={isSending || body.trim() === ""} className="self-end">{chat.sendLabel}</Button>
      </form>
    </aside>
  )
}

export default ChatPanel

import { completeArtifact } from "@/procedures/complete-artifact"
import type { ProcedureContext } from "@/procedures/context"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { listenForReviewer, type ListenPacket } from "@/procedures/listen-for-reviewer"
import { sendAgentMessage } from "@/procedures/send-agent-message"
import type { JournalEntry } from "./conversation"

const THINKING_DELAY_MS = 1800

export interface DemoAgentScript {
  readonly key: ReviewKey
  readonly replies: readonly string[]
  readonly readContext: () => ProcedureContext
}

const agentMessageCountOf = (journal: readonly JournalEntry[]): number =>
  journal.filter((entry) => entry.event.kind === "agent-message").length

const NO_REPLY = "This demo has no scripted reply."

export const nextReplyOf = (journal: readonly JournalEntry[], replies: readonly string[]): string =>
  replies.length === 0 ? NO_REPLY : replies[agentMessageCountOf(journal) % replies.length]

const drain = async (iterator: AsyncIterator<ListenPacket>, drained: readonly ListenPacket[]): Promise<readonly ListenPacket[]> => {
  const next = await iterator.next()
  return next.done === true ? drained : await drain(iterator, [...drained, next.value])
}

const reply = async (script: DemoAgentScript): Promise<void> => {
  const context = script.readContext()
  const { journal } = await context.conversationEnvironment.store.read(script.key)
  await sendAgentMessage({ ...script.key, body: nextReplyOf(journal, script.replies) }, context)
  await completeArtifact(script.key, context)
}

const afterThinking = (action: () => void): void => {
  setTimeout(action, THINKING_DELAY_MS)
}

const listenOnce = async (script: DemoAgentScript): Promise<void> => {
  const listening = await listenForReviewer(script.key, script.readContext(), null)
  if (listening.kind === "rejected") return
  const packet = (await drain(listening.packets[Symbol.asyncIterator](), [])).at(0)
  if (packet?.kind !== "work") {
    startDemoAgent(script)
    return
  }
  afterThinking(() => {
    void reply(script).then(() => {
      startDemoAgent(script)
    })
  })
}

export const startDemoAgent = (script: DemoAgentScript): void => {
  void listenOnce(script)
}

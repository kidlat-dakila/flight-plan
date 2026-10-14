import { closeAgent } from "@/procedures/close-agent"
import type { ProcedureContext } from "@/procedures/context"
import { endAgentTurn } from "@/procedures/end-agent-turn"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { sendAgentMessage } from "@/procedures/send-agent-message"
import type { JournalEntry } from "./conversation"
import type { AgentExit, AgentLaunch, AgentSpawner, AgentStart } from "./conversation-environment"

const THINKING_DELAY_MS = 1800
const CLOSE_DELAY_MS = 1500
const CLEAN_EXIT: AgentExit = { exitCode: 0 }

export interface DemoAgentScript {
  readonly repliesFor: (key: ReviewKey) => readonly string[]
  readonly readContext: () => ProcedureContext
}

const agentMessageCountOf = (journal: readonly JournalEntry[]): number =>
  journal.filter((entry) => entry.event.kind === "agent-message").length

const NO_REPLY = "This demo has no scripted reply."

export const nextReplyOf = (journal: readonly JournalEntry[], replies: readonly string[]): string =>
  replies.length === 0 ? NO_REPLY : replies[agentMessageCountOf(journal) % replies.length]

const replyOnce = async (sessionId: string, script: DemoAgentScript): Promise<void> => {
  const context = script.readContext()
  const agent = context.conversationEnvironment.agents.findBySessionId(sessionId)
  if (agent === null) return
  const { journal } = await context.conversationEnvironment.store.read(agent.key)
  const body = nextReplyOf(journal, script.repliesFor(agent.key))
  await sendAgentMessage({ ...agent.key, body }, context)
  const ending = await endAgentTurn({ sessionId, lastAssistantMessage: body }, context)
  if (ending.kind === "close") {
    setTimeout(() => {
      closeAgent(ending.key, "turn-ended", context)
    }, CLOSE_DELAY_MS)
    return
  }
  if (ending.kind === "continue") scheduleReply(sessionId, script)
}

const scheduleReply = (sessionId: string, script: DemoAgentScript): void => {
  setTimeout(() => {
    void replyOnce(sessionId, script)
  }, THINKING_DELAY_MS)
}

export const createDemoAgent = (script: DemoAgentScript): AgentSpawner =>
  async (launch: AgentLaunch, onExit: (exit: AgentExit) => void): Promise<AgentStart> => {
    scheduleReply(launch.sessionId, script)
    return await Promise.resolve({
      kind: "started",
      process: { stop: () => { onExit(CLEAN_EXIT) }, readOutput: () => "" },
    })
  }

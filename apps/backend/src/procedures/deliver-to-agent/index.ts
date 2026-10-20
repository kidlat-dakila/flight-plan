import type { ProcedureContext } from "@/procedures/context"
import type { RunningAgent } from "@/procedures/get-conversation/utils/agent-registry"
import { formatInbound, spawnInstructionsOf } from "@/procedures/get-conversation/utils/agent-text"
import {
  lastSequenceOf,
  latestModelChoiceOf,
  pendingInboundOf,
  type Conversation,
  type JournalEntry,
} from "@/procedures/get-conversation/utils/conversation"
import {
  appendAndPublish,
  findReviewTarget,
  recordAgentFailure,
} from "@/procedures/get-conversation/utils/conversation-actions"
import type { AgentExit, AgentSpawner } from "@/procedures/get-conversation/utils/conversation-environment"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { AGENT_NAMES, type AgentInstall, type AgentName } from "@/procedures/get-setup/utils/setup"
import { handleAgentExit } from "@/procedures/handle-agent-exit"
import { requestQueuedWriteUps } from "@/procedures/request-queued-write-ups"
import { chooseWriter } from "./utils/choose-writer"
import { planDelivery, type DeliveryPlan } from "./utils/plan-delivery"

export type DeliveryOutcome
  = | Exclude<DeliveryPlan, { readonly kind: "spawn" }>
    | { readonly kind: "spawned", readonly sessionId: string }
    | { readonly kind: "failed", readonly reason: string }

interface Spawning {
  readonly key: ReviewKey
  readonly conversation: Conversation
  readonly pending: readonly JournalEntry[]
  readonly install: AgentInstall
  readonly effort: string
  readonly workingPath: string
}

const spawnableAgentsOf = (context: ProcedureContext): readonly AgentName[] =>
  AGENT_NAMES.filter((agent) => context.conversationEnvironment.spawners[agent] !== undefined)

const startingAgent = (key: ReviewKey, agent: AgentName, sessionId: string, now: Date): RunningAgent => ({
  key,
  agent,
  sessionId,
  process: null,
  phase: "starting",
  startedAt: now,
  lastActivityAt: now,
  closing: null,
  isAwaitingPermission: false,
  wasReminded: false,
})

const onExitOf = (key: ReviewKey, sessionId: string, context: ProcedureContext) => (exit: AgentExit): void => {
  void handleAgentExit({ key, sessionId, exitCode: exit.exitCode }, context).then(async (outcome) => {
    const hasQueuedWriteUps = await requestQueuedWriteUps(key, context)
    if (outcome.shouldRedeliver || hasQueuedWriteUps) await deliverToAgent(key, context)
  })
}

const launchAgent = async (
  spawning: Spawning,
  sessionId: string,
  spawner: AgentSpawner,
  context: ProcedureContext,
): Promise<DeliveryOutcome> => {
  const { key, conversation, pending, install, effort, workingPath } = spawning
  const { agents, newId } = context.conversationEnvironment
  const start = await spawner(
    {
      agent: install.agent,
      installPath: install.installPath,
      sessionId,
      isResume: conversation.sessionId === sessionId,
      workingPath,
      model: install.model,
      effort,
      prompt: formatInbound(pending, conversation.journal),
      instructions: spawnInstructionsOf(key),
    },
    onExitOf(key, sessionId, context),
  )
  if (start.kind === "failed") {
    agents.release(key, sessionId)
    await recordAgentFailure(key, start.reason, context)
    return start
  }
  const started = agents.update(key, (agent) => ({ ...agent, process: start.process }))
  if (started?.closing !== null) start.process.stop()
  await appendAndPublish(
    key,
    [{ kind: "delivery", id: newId(), throughSequence: lastSequenceOf(pending), channel: "spawn", deliveredAt: context.now() }],
    context,
  )
  return { kind: "spawned", sessionId }
}

const spawnAgent = async (spawning: Spawning, context: ProcedureContext): Promise<DeliveryOutcome> => {
  const { agents, spawners, newId, hub } = context.conversationEnvironment
  const spawner = spawners[spawning.install.agent]
  if (spawner === undefined) return { kind: "unavailable", reason: `No spawner is registered for ${spawning.install.agent}.` }
  const sessionId = spawning.conversation.sessionId ?? newId()
  if (!agents.claim(startingAgent(spawning.key, spawning.install.agent, sessionId, context.now()))) {
    return { kind: "agent-running" }
  }
  hub.publish(spawning.key)
  return await launchAgent(spawning, sessionId, spawner, context)
}

export const deliverToAgent = async (key: ReviewKey, context: ProcedureContext): Promise<DeliveryOutcome> => {
  const { store, agents } = context.conversationEnvironment
  const [conversation, setup, target, request] = await Promise.all([
    store.read(key),
    context.setupStore.read(),
    findReviewTarget(key, context),
    context.reviewStore.findRequest(key),
  ])
  const pending = pendingInboundOf(conversation.journal)
  const plan = planDelivery({
    pendingCount: pending.length,
    runningAgent: agents.find(key),
    listenerPresence: agents.listenerPresence(key),
    agents: setup.agents,
    spawnableAgents: spawnableAgentsOf(context),
    target,
    now: context.now(),
  })
  if (plan.kind === "unavailable") await recordAgentFailure(key, plan.reason, context)
  if (plan.kind !== "spawn") return plan
  const writer = chooseWriter(plan.install, request, latestModelChoiceOf(conversation.journal, plan.install.agent))
  return await spawnAgent({ key, conversation, pending, ...writer, workingPath: plan.workingPath }, context)
}

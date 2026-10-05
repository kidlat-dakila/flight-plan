import type { ProcedureContext } from "@/procedures/context"
import { findAnswerSet, findWithdrawal, type AnswerSet } from "@/procedures/get-conversation/utils/conversation"
import { appendAndPublish, confirmAgentStart } from "@/procedures/get-conversation/utils/conversation-actions"
import { readsOnChange, type ConversationSubscription } from "@/procedures/get-conversation/utils/conversation-hub"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { ALLOW_LABEL, permissionQuestionOf } from "./utils/describe-permission"

export const PERMISSION_WAIT_MS = 590_000

export interface PermissionInput {
  readonly sessionId: string
  readonly toolName: string
  readonly toolInput: unknown
}

export type PermissionDecision
  = | { readonly kind: "allow" }
    | { readonly kind: "deny", readonly message: string }
    | { readonly kind: "unknown-session" }

type AnswerWait = { readonly kind: "answered", readonly answerSet: AnswerSet } | { readonly kind: "withdrawn" } | { readonly kind: "pending" }

interface PermissionWait {
  readonly key: ReviewKey
  readonly batchId: string
  readonly sessionId: string
  readonly subscription: ConversationSubscription
  readonly deadlineMs: number
}

const DENIED_MESSAGE = "The reviewer denied this."
const UNANSWERED_MESSAGE = "The reviewer did not answer in time, so this was refused."
const UNANSWERED_REASON = "The agent stopped waiting for an answer."
const STOPPED_REASON = "The agent stopped before you answered."

const readAnswer = async (key: ReviewKey, batchId: string, context: ProcedureContext): Promise<AnswerWait> => {
  const { journal } = await context.conversationEnvironment.store.read(key)
  const answerSet = findAnswerSet(journal, batchId)
  if (answerSet !== null) return { kind: "answered", answerSet }
  return findWithdrawal(journal, batchId) === null ? { kind: "pending" } : { kind: "withdrawn" }
}

const isAgentGone = (sessionId: string, context: ProcedureContext): boolean =>
  context.conversationEnvironment.agents.findBySessionId(sessionId) === null

const waitForAnswer = async (wait: PermissionWait, context: ProcedureContext): Promise<AnswerWait> => {
  const first = await readAnswer(wait.key, wait.batchId, context)
  if (first.kind !== "pending") return first
  const remainingMs = () => wait.deadlineMs - context.now().getTime()
  const answers = readsOnChange(wait.subscription, { signal: null, remainingMs }, async () => await readAnswer(wait.key, wait.batchId, context))
  for await (const answer of answers) {
    if (answer.kind !== "pending" || isAgentGone(wait.sessionId, context)) return answer
  }
  return await readAnswer(wait.key, wait.batchId, context)
}

const decisionOf = (answerSet: AnswerSet): PermissionDecision => {
  const answer = answerSet.answers.at(0)
  if (answer === undefined) return { kind: "deny", message: DENIED_MESSAGE }
  if (answer.pickedLabels.includes(ALLOW_LABEL)) return { kind: "allow" }
  return { kind: "deny", message: answer.text === null ? DENIED_MESSAGE : `${DENIED_MESSAGE} ${answer.text}` }
}

const withdraw = async (wait: PermissionWait, context: ProcedureContext): Promise<void> => {
  const reason = isAgentGone(wait.sessionId, context) ? STOPPED_REASON : UNANSWERED_REASON
  await appendAndPublish(
    wait.key,
    [{ kind: "questions-withdrawn", id: context.conversationEnvironment.newId(), batchId: wait.batchId, reason, withdrawnAt: context.now() }],
    context,
  )
}

export const requestPermission = async (input: PermissionInput, context: ProcedureContext): Promise<PermissionDecision> => {
  const { agents, hub, newId } = context.conversationEnvironment
  const agent = await confirmAgentStart(input.sessionId, context)
  if (agent === null) return { kind: "unknown-session" }
  const { key } = agent
  const batchId = newId()
  const now = context.now()
  const subscription = hub.subscribe(key)
  agents.update(key, (current) => ({ ...current, isAwaitingPermission: true, lastActivityAt: now }))
  try {
    await appendAndPublish(
      key,
      [{ kind: "question-batch", id: batchId, origin: "permission", questions: [permissionQuestionOf(`${batchId}-1`, input.toolName, input.toolInput)], askedAt: now }],
      context,
    )
    const wait = { key, batchId, sessionId: input.sessionId, subscription, deadlineMs: now.getTime() + PERMISSION_WAIT_MS }
    const answer = await waitForAnswer(wait, context)
    if (answer.kind === "answered") return decisionOf(answer.answerSet)
    if (answer.kind === "pending") await withdraw(wait, context)
    return { kind: "deny", message: UNANSWERED_MESSAGE }
  } finally {
    subscription.close()
    agents.update(key, (current) => ({ ...current, isAwaitingPermission: false, lastActivityAt: context.now() }))
    hub.publish(key)
  }
}

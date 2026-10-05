import { hasOutboundAfter, lastDeliveredSequenceOf, pendingInboundOf, type JournalEntry } from "@/procedures/get-conversation/utils/conversation"

export interface TurnFacts {
  readonly journal: readonly JournalEntry[]
  readonly wasReminded: boolean
  readonly lastAssistantMessage: string | null
}

export type TurnPlan
  = | { readonly kind: "deliver", readonly pending: readonly JournalEntry[], readonly unsentReply: string | null }
    | { readonly kind: "remind" }
    | { readonly kind: "close", readonly unsentReply: string | null }

const unsentReplyOf = (facts: TurnFacts, hasWritten: boolean): string | null => {
  const text = facts.lastAssistantMessage?.trim() ?? ""
  return text === "" || hasWritten ? null : text
}

export const planTurnEnding = (facts: TurnFacts): TurnPlan => {
  const pending = pendingInboundOf(facts.journal)
  const hasWritten = hasOutboundAfter(facts.journal, lastDeliveredSequenceOf(facts.journal))
  if (pending.length > 0) return { kind: "deliver", pending, unsentReply: unsentReplyOf(facts, hasWritten) }
  if (!hasWritten && !facts.wasReminded) return { kind: "remind" }
  return { kind: "close", unsentReply: unsentReplyOf(facts, hasWritten) }
}

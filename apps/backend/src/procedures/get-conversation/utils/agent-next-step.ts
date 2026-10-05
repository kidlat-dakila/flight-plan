import type { ProcedureContext } from "@/procedures/context"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { listenCommandOf } from "./agent-text"

export const SPAWNED_AFTER_ASKING = "End your turn now. Flight Plan resumes this session with the reviewer's answers."

export const listenInstructionOf = (command: string): string =>
  `Run this in the background. It exits when the reviewer replies, and its output holds the reply:\n${command}`

export const isSpawnedFor = (key: ReviewKey, context: ProcedureContext): boolean =>
  context.conversationEnvironment.agents.find(key) !== null

export const listenCommandFor = (key: ReviewKey, context: ProcedureContext): string =>
  listenCommandOf(context.conversationEnvironment.serverUrl, key)

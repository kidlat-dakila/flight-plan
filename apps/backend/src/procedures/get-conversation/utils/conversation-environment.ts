import type { AgentName } from "@/procedures/get-setup/utils/setup"
import type { AgentProcess, AgentRegistry } from "./agent-registry"
import type { ConversationHub } from "./conversation-hub"
import type { ConversationStore } from "./conversation-store"

export interface AgentLaunch {
  readonly agent: AgentName
  readonly installPath: string
  readonly sessionId: string
  readonly isResume: boolean
  readonly workingPath: string
  readonly model: string
  readonly effort: string
  readonly prompt: string
  readonly instructions: string
}

export type AgentStart
  = | { readonly kind: "started", readonly process: AgentProcess }
    | { readonly kind: "failed", readonly reason: string }

export interface AgentExit {
  readonly exitCode: number
}

export type AgentSpawner = (launch: AgentLaunch, onExit: (exit: AgentExit) => void) => Promise<AgentStart>

export type AgentSpawners = Partial<Record<AgentName, AgentSpawner>>

export interface ConversationEnvironment {
  readonly store: ConversationStore
  readonly hub: ConversationHub
  readonly agents: AgentRegistry
  readonly spawners: AgentSpawners
  readonly serverUrl: string
  readonly newId: () => string
}

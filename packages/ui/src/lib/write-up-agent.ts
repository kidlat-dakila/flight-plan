import { createContext } from "react"

export type AgentName = "claude" | "codex" | "cursor"

export interface WriteUpAgent {
  readonly name: AgentName
  readonly label: string
}

export const WriteUpAgentContext = createContext<WriteUpAgent | null>(null)

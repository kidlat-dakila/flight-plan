import type { ReviewPreferences } from "@/procedures/get-review-preferences/utils/review-preferences"

export const SETUP_STEPS = ["repositories", "forges", "agents", "configuration"] as const

export type SetupStep = (typeof SETUP_STEPS)[number]

export const AGENT_NAMES = ["claude", "codex", "cursor"] as const

export type AgentName = (typeof AGENT_NAMES)[number]

export const TERMINAL_APPS = ["terminal", "iterm", "ghostty", "warp"] as const

export type TerminalApp = (typeof TERMINAL_APPS)[number]

export const DEFAULT_TERMINAL_APP: TerminalApp = "terminal"

export const SETUP_FORGES = ["git", "gh", "glab", "github", "gitlab", "bitbucket"] as const

export type SetupForge = (typeof SETUP_FORGES)[number]

export const PRESET_NAMES = ["standard", "minimal", "onboardee", "unfamiliar-territory"] as const

export type PresetName = (typeof PRESET_NAMES)[number]

export const DEFAULT_MODEL = "default"

export const DEFAULT_EFFORT = "default"

export interface AgentInstall {
  readonly agent: AgentName
  readonly installPath: string
  readonly model: string
  readonly effort: string
}

export interface AgentsChoice {
  readonly installs: readonly AgentInstall[]
  readonly defaultAgent: AgentName
  readonly terminalApp: TerminalApp
}

export interface ForgeConnection {
  readonly forge: SetupForge
  readonly username: string
  readonly baseUrl: string
  readonly hasCredential: boolean
}

export interface ForgesChoice {
  readonly connections: readonly ForgeConnection[]
}

export interface RepositoryAuthor {
  readonly id: string
  readonly name: string
  readonly detail: string
  readonly avatarUrl: string | null
}

export interface SetupRepository {
  readonly name: string
  readonly path: string
  readonly selfAuthor: RepositoryAuthor | null
  readonly trackedAuthors: readonly RepositoryAuthor[]
}

export interface Setup {
  readonly agents: AgentsChoice | null
  readonly forges: ForgesChoice | null
  readonly defaultConfiguration: string | null
  readonly repositories: readonly SetupRepository[]
  readonly reviewPreferences: ReviewPreferences | null
  readonly isComplete: boolean
}

export const EMPTY_SETUP: Setup = {
  agents: null,
  forges: null,
  defaultConfiguration: null,
  repositories: [],
  reviewPreferences: null,
  isComplete: false,
}

export const terminalAppOf = (setup: Setup): TerminalApp => setup.agents?.terminalApp ?? DEFAULT_TERMINAL_APP

export const LOCAL_GIT_FORGE: SetupForge = "git"

export type RepositoryForges = Readonly<Record<string, SetupForge>>

export const repositoryForgeOf = (repositoryForges: RepositoryForges, path: string): SetupForge =>
  repositoryForges[path] ?? LOCAL_GIT_FORGE

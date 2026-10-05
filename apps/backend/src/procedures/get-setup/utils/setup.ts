export const SETUP_STEPS = ["agents", "forges", "configuration", "repositories"] as const

export type SetupStep = (typeof SETUP_STEPS)[number]

export const AGENT_NAMES = ["claude", "codex", "cursor"] as const

export type AgentName = (typeof AGENT_NAMES)[number]

export const AGENT_CONNECTIONS = ["direct", "manual"] as const

export type AgentConnection = (typeof AGENT_CONNECTIONS)[number]

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
  readonly connection: AgentConnection
}

export interface ForgeConnection {
  readonly forge: SetupForge
  readonly username: string
  readonly baseUrl: string
  readonly hasCredential: boolean
}

export interface ForgesChoice {
  readonly connections: readonly ForgeConnection[]
  readonly defaultForge: SetupForge
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
  readonly preset: PresetName | null
  readonly repositories: readonly SetupRepository[]
  readonly isComplete: boolean
}

export const EMPTY_SETUP: Setup = {
  agents: null,
  forges: null,
  preset: null,
  repositories: [],
  isComplete: false,
}

const FORGE_WITHOUT_ACCOUNT: SetupForge = "git"

export const authorForgeOf = (setup: Setup): SetupForge => setup.forges?.defaultForge ?? FORGE_WITHOUT_ACCOUNT

export const needsSelfAuthor = (forge: SetupForge): boolean => forge === FORGE_WITHOUT_ACCOUNT

export type RepositoryForges = Readonly<Record<string, SetupForge>>

export const repositoryForgeOf = (setup: Setup, repositoryForges: RepositoryForges, path: string): SetupForge =>
  repositoryForges[path] ?? authorForgeOf(setup)

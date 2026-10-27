import type { RepositoryActivity } from "@/procedures/list-recent-repositories/utils/repository-activity"
import type { ForgeProblem } from "@/procedures/list-repositories/utils/repository"
import type { ListedModel } from "./agent-models"
import type { GitIdentity } from "./git-identity"
import type { AgentInstall, AgentName, ForgesChoice, RepositoryAuthor, SetupForge, TerminalApp } from "./setup"

export interface AgentDetection {
  readonly agent: AgentName
  readonly installPath: string | null
  readonly hasCli: boolean
}

export type AgentInstallation
  = | { readonly kind: "installed" }
    | { readonly kind: "failed", readonly reason: string }

export type CredentialSaving
  = | { readonly kind: "saved" }
    | { readonly kind: "failed", readonly reason: string }

export type ForgeCli = "gh" | "glab"

export type CliState
  = | { readonly kind: "signed-in", readonly account: string }
    | { readonly kind: "signed-out" }
    | { readonly kind: "missing" }

export interface CliProbe {
  readonly cli: ForgeCli
  readonly state: CliState
}

export interface FolderEntry {
  readonly name: string
  readonly path: string
  readonly isRepository: boolean
}

export interface FolderListing {
  readonly path: string
  readonly parentPath: string | null
  readonly folders: readonly FolderEntry[]
}

export interface RepositoryFolderIndex {
  readonly rootPath: string
  readonly paths: readonly string[]
}

export interface AuthorSource {
  readonly repositoryPath: string
  readonly forge: SetupForge
  readonly forges: ForgesChoice | null
}

export interface AuthorSearchResult {
  readonly authors: readonly RepositoryAuthor[]
  readonly problem: ForgeProblem | null
}

export interface SetupEnvironment {
  readonly detectAgents: () => Promise<readonly AgentDetection[]>
  readonly hasAgentCli: (agent: AgentName) => Promise<boolean>
  readonly detectTerminalApps: () => Promise<readonly TerminalApp[]>
  readonly listAgentModels: (agent: AgentName) => Promise<readonly ListedModel[]>
  readonly installAgent: (install: AgentInstall) => Promise<AgentInstallation>
  readonly isAgentInstallCurrent: (install: AgentInstall) => Promise<boolean>
  readonly probeForgeClis: () => Promise<readonly CliProbe[]>
  readonly findRepositoryFolders: () => Promise<RepositoryFolderIndex>
  readonly listFolders: (path: string | null) => Promise<FolderListing | null>
  readonly readFolderEntries: (path: string) => Promise<readonly string[] | null>
  readonly isRepositoryFolder: (path: string) => Promise<boolean>
  readonly findRepositoryForge: (path: string, forges: ForgesChoice | null) => Promise<SetupForge>
  readonly searchAuthors: (source: AuthorSource, query: string) => Promise<AuthorSearchResult>
  readonly findAuthor: (source: AuthorSource, authorId: string) => Promise<RepositoryAuthor | null>
  readonly readGitIdentity: (repositoryPath: string) => Promise<GitIdentity | null>
  readonly readRepositoryActivity: (repositoryPath: string, authorEmail: string) => Promise<RepositoryActivity | null>
  readonly saveForgeCredential: (forge: SetupForge, token: string) => Promise<CredentialSaving>
}

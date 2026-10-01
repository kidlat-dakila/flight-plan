import type { AgentName, RepositoryAuthor, SetupForge } from "./setup"

export interface AgentDetection {
  readonly agent: AgentName
  readonly installPath: string | null
}

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

export interface AuthorSource {
  readonly repositoryPath: string
  readonly forge: SetupForge
}

export interface SetupEnvironment {
  readonly detectAgents: () => Promise<readonly AgentDetection[]>
  readonly probeForgeClis: () => Promise<readonly CliProbe[]>
  readonly searchRepositoryFolders: (query: string) => Promise<readonly string[]>
  readonly listFolders: (path: string | null) => Promise<FolderListing | null>
  readonly isRepositoryFolder: (path: string) => Promise<boolean>
  readonly searchAuthors: (source: AuthorSource, query: string) => Promise<readonly RepositoryAuthor[]>
  readonly findAuthor: (source: AuthorSource, authorId: string) => Promise<RepositoryAuthor | null>
  readonly saveForgeCredential: (forge: SetupForge, token: string) => Promise<void>
}

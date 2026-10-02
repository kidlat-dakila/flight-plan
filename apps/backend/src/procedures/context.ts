import type { CodeHighlighter } from "@/procedures/get-review/utils/code/highlighter"
import { createMockReviews } from "@/procedures/get-review/utils/mocks/review-artifacts"
import { InMemoryReviewStore, type ReviewStore } from "@/procedures/get-review/utils/review-store"
import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import type { SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { InMemorySetupStore, type SetupStore } from "@/procedures/get-setup/utils/setup-store"
import { createMockRepositories } from "@/procedures/list-repositories/utils/mock-repositories"
import { InMemoryRepositoryStore, type RepositoryStore } from "@/procedures/list-repositories/utils/repository-store"
import { createAgentDetector } from "@/utils/agent-detector"
import { createAgentInstaller } from "@/utils/agent-installer"
import { createAuthorLookup } from "@/utils/author-lookup"
import { createCodeHighlighter } from "@/utils/code-highlighter"
import { createCommitAuthorReader } from "@/utils/commit-author-reader"
import { createAgentCliProbe } from "@/utils/executable-finder"
import { createFolderLister, isRepositoryFolder, readFolderEntries } from "@/utils/folder-lister"
import { createForgeCliProbe } from "@/utils/forge-cli-probe"
import { createForgeCredentialSaver, saveInKeychain } from "@/utils/forge-credential-saver"
import { createRepositoryFolderFinder } from "@/utils/repository-folder-finder"
import { runCommand } from "@/utils/run-command"
import { FileSetupStore } from "@/utils/setup-file-store"

export interface ProcedureContext {
  readonly repositoryStore: RepositoryStore
  readonly reviewStore: ReviewStore
  readonly setupStore: SetupStore
  readonly setupEnvironment: SetupEnvironment
  readonly highlightCode: CodeHighlighter
  readonly now: () => Date
  readonly dataNotice: string | null
}

const SAMPLE_DATA_NOTICE = "Sample data. These repositories and pull requests are not real."

export const createMockProcedureContext = (startedAt: Date): ProcedureContext => ({
  repositoryStore: new InMemoryRepositoryStore(createMockRepositories(startedAt)),
  reviewStore: new InMemoryReviewStore(createMockReviews(startedAt)),
  setupStore: new InMemorySetupStore(EMPTY_SETUP),
  setupEnvironment: createMockSetupEnvironment(),
  highlightCode: createCodeHighlighter(),
  now: () => new Date(),
  dataNotice: SAMPLE_DATA_NOTICE,
})

export interface LocalMachine {
  readonly dataPath: string
  readonly pluginPath: string
  readonly mcpUrl: string
  readonly homePath: string
  readonly environment: Environment
}

const COMMIT_LIMIT = 1000

export const createLocalProcedureContext = (startedAt: Date, machine: LocalMachine): ProcedureContext => {
  const mockContext = createMockProcedureContext(startedAt)
  return {
    ...mockContext,
    setupStore: new FileSetupStore(machine.dataPath),
    setupEnvironment: {
      ...mockContext.setupEnvironment,
      detectAgents: createAgentDetector(machine),
      hasAgentCli: createAgentCliProbe(machine),
      installAgent: createAgentInstaller({ ...machine, runCommand }),
      probeForgeClis: createForgeCliProbe({ ...machine, runCommand }),
      saveForgeCredential: createForgeCredentialSaver(saveInKeychain),
      ...createAuthorLookup({
        readCommitAuthors: createCommitAuthorReader({
          runCommand,
          environment: machine.environment,
          commitLimit: COMMIT_LIMIT,
        }),
        forgeLookup: mockContext.setupEnvironment,
      }),
      findRepositoryFolders: createRepositoryFolderFinder({ rootPath: machine.homePath, now: () => new Date() }),
      listFolders: createFolderLister(machine.homePath),
      readFolderEntries,
      isRepositoryFolder,
    },
  }
}

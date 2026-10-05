import { randomUUID } from "node:crypto"
import { InMemoryAgentRegistry } from "@/procedures/get-conversation/utils/agent-registry"
import type { AgentSpawners, ConversationEnvironment } from "@/procedures/get-conversation/utils/conversation-environment"
import { InMemoryConversationStore } from "@/procedures/get-conversation/utils/conversation-store"
import { readSampleInstructionTexts, type InstructionReader } from "@/procedures/get-instructions/utils/instruction-texts"
import { InMemoryChangeReader, type ChangeReader } from "@/procedures/get-review/utils/change-reader"
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
import { spawnPluginPathOf } from "@/procedures/save-setup-step/utils/claude-plugin"
import { createAgentDetector } from "@/utils/agent-detector"
import { createAgentInstaller } from "@/utils/agent-installer"
import { createAgentModelLister } from "@/utils/agent-model-lister"
import { createAuthorLookup } from "@/utils/author-lookup"
import { createClaudeSpawner } from "@/utils/claude-spawner"
import { createCodeHighlighter } from "@/utils/code-highlighter"
import { createCommitAuthorReader } from "@/utils/commit-author-reader"
import { FileConversationStore } from "@/utils/conversation-file-store"
import { createConversationHub } from "@/utils/conversation-hub"
import { createAgentCliProbe } from "@/utils/executable-finder"
import { createFolderLister, isRepositoryFolder, readFolderEntries } from "@/utils/folder-lister"
import { createForgeCliProbe } from "@/utils/forge-cli-probe"
import { createForgeCredentialReader, readFromKeychain } from "@/utils/forge-credential-reader"
import { createForgeCredentialSaver, saveInKeychain } from "@/utils/forge-credential-saver"
import { assembleGitAdapter } from "@/utils/git-adapter/helpers/assemble"
import { readRemote } from "@/utils/git-adapter/helpers/remote"
import { createGitChangeReader } from "@/utils/git-change-reader"
import { InstructionFileReader } from "@/utils/instruction-file-reader"
import { LiveRepositoryStore } from "@/utils/live-repository-store"
import { createRepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import { createRepositoryFolderFinder } from "@/utils/repository-folder-finder"
import { createRepositoryForgeFinder } from "@/utils/repository-forge-finder"
import { RepositoryInspector } from "@/utils/repository-inspector"
import { FileReviewStore } from "@/utils/review-file-store"
import { runCommand } from "@/utils/run-command"
import { FileSetupStore } from "@/utils/setup-file-store"
import { FileTargetMemoryStore } from "@/utils/target-memory-file-store"

export interface ProcedureContext {
  readonly repositoryStore: RepositoryStore
  readonly reviewStore: ReviewStore
  readonly changeReader: ChangeReader
  readonly setupStore: SetupStore
  readonly setupEnvironment: SetupEnvironment
  readonly conversationEnvironment: ConversationEnvironment
  readonly highlightCode: CodeHighlighter
  readonly readInstructionTexts: InstructionReader
  readonly now: () => Date
  readonly dataNotice: string | null
}

const MOCK_SERVER_URL = "http://localhost:3000"
const NO_SPAWNERS: AgentSpawners = {}

export const createConversationEnvironment = (
  overrides: Partial<ConversationEnvironment> = {},
): ConversationEnvironment => ({
  store: new InMemoryConversationStore(),
  hub: createConversationHub(),
  agents: new InMemoryAgentRegistry(),
  spawners: NO_SPAWNERS,
  serverUrl: MOCK_SERVER_URL,
  newId: randomUUID,
  ...overrides,
})

const SAMPLE_DATA_NOTICE = "Sample data. These repositories and pull requests are not real."

export const createMockProcedureContext = (startedAt: Date): ProcedureContext => ({
  repositoryStore: new InMemoryRepositoryStore(createMockRepositories(startedAt), SAMPLE_DATA_NOTICE),
  reviewStore: new InMemoryReviewStore(createMockReviews(startedAt)),
  changeReader: new InMemoryChangeReader([]),
  setupStore: new InMemorySetupStore(EMPTY_SETUP),
  setupEnvironment: createMockSetupEnvironment(),
  conversationEnvironment: createConversationEnvironment(),
  highlightCode: createCodeHighlighter(),
  readInstructionTexts: readSampleInstructionTexts,
  now: () => new Date(),
  dataNotice: SAMPLE_DATA_NOTICE,
})

export interface LocalMachine {
  readonly dataPath: string
  readonly pluginPath: string
  readonly configurationsPath: string
  readonly mcpUrl: string
  readonly serverUrl: string
  readonly homePath: string
  readonly environment: Environment
}

const COMMIT_LIMIT = 1000

export const createLocalProcedureContext = (startedAt: Date, machine: LocalMachine): ProcedureContext => {
  const mockContext = createMockProcedureContext(startedAt)
  const setupStore = new FileSetupStore(machine.dataPath)
  const repositoryAdapterDependencies = {
    readRemote,
    openAdapter: assembleGitAdapter,
    readCredential: createForgeCredentialReader(readFromKeychain),
    environment: machine.environment,
  }
  const inspector = new RepositoryInspector({ ...repositoryAdapterDependencies, now: () => new Date() })
  return {
    ...mockContext,
    setupStore,
    reviewStore: new FileReviewStore(machine.dataPath, mockContext.reviewStore),
    readInstructionTexts: new InstructionFileReader(machine.configurationsPath).read,
    changeReader: createGitChangeReader({ runCommand, environment: machine.environment }),
    conversationEnvironment: createConversationEnvironment({
      store: new FileConversationStore(machine.dataPath),
      spawners: { claude: createClaudeSpawner({ ...machine, spawnPluginPath: spawnPluginPathOf(machine.dataPath) }) },
      serverUrl: machine.serverUrl,
    }),
    repositoryStore: new LiveRepositoryStore({
      setupStore,
      inspector,
      targetMemory: new FileTargetMemoryStore(machine.dataPath),
      now: () => new Date(),
    }),
    setupEnvironment: {
      ...mockContext.setupEnvironment,
      detectAgents: createAgentDetector(machine),
      hasAgentCli: createAgentCliProbe(machine),
      listAgentModels: createAgentModelLister(machine),
      installAgent: createAgentInstaller({ ...machine, runCommand }),
      probeForgeClis: createForgeCliProbe({ ...machine, runCommand }),
      saveForgeCredential: createForgeCredentialSaver(saveInKeychain),
      ...createAuthorLookup({
        readCommitAuthors: createCommitAuthorReader({
          runCommand,
          environment: machine.environment,
          commitLimit: COMMIT_LIMIT,
        }),
        openRepository: createRepositoryAdapterOpener(repositoryAdapterDependencies),
      }),
      findRepositoryFolders: createRepositoryFolderFinder({ rootPath: machine.homePath, now: () => new Date() }),
      listFolders: createFolderLister(machine.homePath),
      readFolderEntries,
      isRepositoryFolder,
      findRepositoryForge: createRepositoryForgeFinder({ readRemote }),
    },
  }
}

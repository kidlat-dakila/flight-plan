import { randomUUID } from "node:crypto"
import { InMemoryAgentPresenceRegistry } from "@/procedures/get-conversation/utils/agent-presence"
import type { ConversationEnvironment } from "@/procedures/get-conversation/utils/conversation-environment"
import { InMemoryConversationStore } from "@/procedures/get-conversation/utils/conversation-store"
import { startDemoAgent } from "@/procedures/get-conversation/utils/demo-agent"
import { IDLE_LIMIT_MS, InMemoryReviewerActivityRegistry } from "@/procedures/get-conversation/utils/reviewer-activity"
import { readSampleInstructionTexts, type InstructionReader } from "@/procedures/get-instructions/utils/instruction-texts"
import { PACKAGE_NAME } from "@/procedures/get-published-review/utils/install-guide"
import { skipBranchPull, type BranchPuller } from "@/procedures/get-review/utils/branch-puller"
import { InMemoryChangeReader, type ChangeReader } from "@/procedures/get-review/utils/change-reader"
import {
  DEMO_VIEWER_LOGIN,
  demoReviewKeyOf,
  toDemoAgentReplies,
  toDemoChat,
  toDemoPullRequest,
  toDemoRepository,
  toDemoScaffold,
  toDemoSetup,
  toDemoStoredReview,
  type DemoReview,
} from "@/procedures/get-review/utils/mocks/demo-reviews"
import { createMockReviews, createSamplePullRequests } from "@/procedures/get-review/utils/mocks/review-artifacts"
import { InMemoryPullRequestForge, type PullRequestForge } from "@/procedures/get-review/utils/pull-request-forge"
import { InMemoryReviewStore, type ReviewStore } from "@/procedures/get-review/utils/review-store"
import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import type { SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { InMemorySetupStore, type SetupStore } from "@/procedures/get-setup/utils/setup-store"
import type { UpdateChecker } from "@/procedures/get-update-notice/utils/update-checker"
import { InMemoryImportFileStore, type ImportFileStore } from "@/procedures/import-review/utils/import-file-store"
import { InMemoryConfigurationStore, type ConfigurationStore } from "@/procedures/list-configurations/utils/configuration-store"
import type { FixtureCatalog } from "@/procedures/list-fixtures/utils/fixture-catalog"
import { createMockRepositories } from "@/procedures/list-repositories/utils/mock-repositories"
import { InMemoryRepositoryStore, type RepositoryStore } from "@/procedures/list-repositories/utils/repository-store"
import { InMemoryAgentTerminalRegistry } from "@/procedures/open-agent-terminal/utils/agent-terminals"
import type { TerminalCloser, TerminalOpener } from "@/procedures/open-agent-terminal/utils/terminal-opener"
import { writeSamplePublishedPage, type PublishedPageWriter } from "@/procedures/publish-artifact/utils/published-page-writer"
import { createAgentDetector } from "@/utils/agent-detector"
import { createAgentInstaller, createInstallChecker } from "@/utils/agent-installer"
import { createAgentModelLister } from "@/utils/agent-model-lister"
import { createAuthorLookup } from "@/utils/author-lookup"
import { createBranchPuller } from "@/utils/branch-puller"
import { createCodeHighlighter } from "@/utils/code-highlighter"
import { createCommitAuthorReader } from "@/utils/commit-author-reader"
import { FileConfigurationStore } from "@/utils/configuration-file-store"
import { FileConversationStore } from "@/utils/conversation-file-store"
import { createConversationHub } from "@/utils/conversation-hub"
import { createAgentCliProbe } from "@/utils/executable-finder"
import { createFolderLister, isRepositoryFolder, readFolderEntries } from "@/utils/folder-lister"
import { createForgeCliProbe } from "@/utils/forge-cli-probe"
import { createForgeCredentialReader, readFromKeychain } from "@/utils/forge-credential-reader"
import { createForgeCredentialSaver, saveInKeychain } from "@/utils/forge-credential-saver"
import { createGitChangeReader } from "@/utils/git-change-reader"
import { createGitIdentityReader } from "@/utils/git-identity-reader"
import { createImportFileStore } from "@/utils/import-file-store"
import { InstructionFileReader } from "@/utils/instruction-file-reader"
import { LiveRepositoryStore } from "@/utils/live-repository-store"
import { createLatestVersionReader, latestManifestUrlOf } from "@/utils/npm-registry-reader"
import { createPublishedPageWriter } from "@/utils/published-page-writer"
import { createPullRequestForge } from "@/utils/pull-request-forge"
import { createRepositoryActivityReader } from "@/utils/repository-activity-reader"
import { createRepositoryAdapterOpener, type RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import { createRepositoryFolderFinder } from "@/utils/repository-folder-finder"
import { createRepositoryForgeFinder } from "@/utils/repository-forge-finder"
import { RepositoryInspector } from "@/utils/repository-inspector"
import { FileReviewStore } from "@/utils/review-file-store"
import { runCommand } from "@/utils/run-command"
import { FileSetupStore } from "@/utils/setup-file-store"
import { FileTargetMemoryStore } from "@/utils/target-memory-file-store"
import { createTerminalCloser, createTerminalOpener } from "@/utils/terminal-opener"
import { createUpdateCheckFile } from "@/utils/update-check-file"
import type { CodeHighlighter } from "@flightplan/codegraph"
import { readRemote, assembleGitAdapter, GitAdapterError } from "@flightplan/git-forge"

export interface ProcedureContext {
  readonly repositoryStore: RepositoryStore
  readonly reviewStore: ReviewStore
  readonly pullRequestForge: PullRequestForge
  readonly changeReader: ChangeReader
  readonly pullBranch: BranchPuller
  readonly openRepository: RepositoryAdapterOpener
  readonly setupStore: SetupStore
  readonly configurationStore: ConfigurationStore
  readonly setupEnvironment: SetupEnvironment
  readonly conversationEnvironment: ConversationEnvironment
  readonly highlightCode: CodeHighlighter
  readonly readInstructionTexts: InstructionReader
  readonly writePublishedPage: PublishedPageWriter
  readonly importFiles: ImportFileStore
  readonly openTerminal: TerminalOpener | null
  readonly closeTerminal: TerminalCloser | null
  readonly appUrl: string
  readonly now: () => Date
  readonly dataNotice: string | null
  readonly fixtureCatalog?: FixtureCatalog
  readonly updateChecker?: UpdateChecker
}

const MOCK_SERVER_URL = "http://localhost:3000"
const MOCK_APP_URL = "http://localhost:4200"

export const createConversationEnvironment = (
  overrides: Partial<ConversationEnvironment> = {},
): ConversationEnvironment => ({
  store: new InMemoryConversationStore(),
  hub: createConversationHub(),
  presence: new InMemoryAgentPresenceRegistry(),
  reviewerActivity: new InMemoryReviewerActivityRegistry(),
  agentTerminals: new InMemoryAgentTerminalRegistry(),
  idleLimitMs: IDLE_LIMIT_MS,
  serverUrl: MOCK_SERVER_URL,
  newId: randomUUID,
  ...overrides,
})

const SAMPLE_REPOSITORY_MESSAGE = "This is a sample repository, so there is no code to read."

export const openSampleRepository: RepositoryAdapterOpener = async () =>
  await Promise.resolve({
    forge: "git",
    adapterName: "git",
    forgeSlug: null,
    resolved: { ok: false, error: new GitAdapterError(SAMPLE_REPOSITORY_MESSAGE, "no-repo"), repo: "" },
  })

const SAMPLE_DATA_NOTICE = "Sample data. These repositories and pull requests are not real."

export const createMockProcedureContext = (startedAt: Date): ProcedureContext => ({
  repositoryStore: new InMemoryRepositoryStore(createMockRepositories(startedAt), SAMPLE_DATA_NOTICE),
  reviewStore: new InMemoryReviewStore(createMockReviews()),
  pullRequestForge: new InMemoryPullRequestForge(createSamplePullRequests(startedAt), () => new Date()),
  changeReader: new InMemoryChangeReader([]),
  pullBranch: skipBranchPull,
  openRepository: openSampleRepository,
  setupStore: new InMemorySetupStore(EMPTY_SETUP),
  configurationStore: new InMemoryConfigurationStore([]),
  setupEnvironment: createMockSetupEnvironment(),
  conversationEnvironment: createConversationEnvironment(),
  highlightCode: createCodeHighlighter(),
  readInstructionTexts: readSampleInstructionTexts,
  writePublishedPage: writeSamplePublishedPage,
  importFiles: new InMemoryImportFileStore(),
  openTerminal: null,
  closeTerminal: null,
  appUrl: MOCK_APP_URL,
  now: () => new Date(),
  dataNotice: SAMPLE_DATA_NOTICE,
})

const seedDemoScaffolds = async (store: InMemoryReviewStore, demos: readonly DemoReview[], now: Date): Promise<void> => {
  const scaffolds = demos.map((demo) => toDemoScaffold(demo, now))
  await Promise.all(scaffolds.map(async ({ key, scaffold }) => {
    await store.writeScaffold(key, scaffold)
  }))
}

const seedDemoChats = async (store: InMemoryConversationStore, demos: readonly DemoReview[], now: Date): Promise<void> => {
  await Promise.all(demos.map(async (demo) => await store.append(demoReviewKeyOf(demo), toDemoChat(demo, now))))
}

export const createDemoProcedureContext = async (
  demos: readonly DemoReview[],
  startedAt: Date,
  newId: () => string,
  readInstructionTexts: InstructionReader = readSampleInstructionTexts,
): Promise<ProcedureContext> => {
  const conversationStore = new InMemoryConversationStore()
  const reviewStore = new InMemoryReviewStore(demos.map(toDemoStoredReview))
  await Promise.all([seedDemoChats(conversationStore, demos, startedAt), seedDemoScaffolds(reviewStore, demos, startedAt)])
  const context: ProcedureContext = {
    repositoryStore: new InMemoryRepositoryStore(demos.map((demo) => toDemoRepository(demo, startedAt)), null, DEMO_VIEWER_LOGIN),
    reviewStore,
    pullRequestForge: new InMemoryPullRequestForge(demos.map((demo) => toDemoPullRequest(demo, startedAt)), () => new Date()),
    changeReader: new InMemoryChangeReader([]),
    pullBranch: skipBranchPull,
    openRepository: openSampleRepository,
    setupStore: new InMemorySetupStore(toDemoSetup(demos)),
    configurationStore: new InMemoryConfigurationStore([]),
    setupEnvironment: createMockSetupEnvironment(),
    conversationEnvironment: createConversationEnvironment({ store: conversationStore, idleLimitMs: null, newId }),
    highlightCode: createCodeHighlighter(),
    readInstructionTexts,
    writePublishedPage: writeSamplePublishedPage,
    importFiles: new InMemoryImportFileStore(),
    openTerminal: null,
    closeTerminal: null,
    appUrl: MOCK_APP_URL,
    now: () => new Date(),
    dataNotice: null,
  }
  demos.forEach((demo) => {
    startDemoAgent({ key: demoReviewKeyOf(demo), replies: toDemoAgentReplies(demo), readContext: () => context })
  })
  return context
}

export interface LocalMachine {
  readonly dataPath: string
  readonly pluginPath: string
  readonly configurationsPath: string
  readonly publishedBundlePath: string
  readonly mcpUrl: string
  readonly serverUrl: string
  readonly appUrl: string
  readonly homePath: string
  readonly platform: string
  readonly environment: Environment
}

const COMMIT_LIMIT = 1000

export interface InstalledPackage {
  readonly dataPath: string
  readonly runningVersion: string
  readonly installPath: string
}

export const createLocalUpdateChecker = ({ dataPath, runningVersion, installPath }: InstalledPackage): UpdateChecker => ({
  runningVersion,
  installPath,
  checkFile: createUpdateCheckFile(dataPath),
  readLatestVersion: createLatestVersionReader({ manifestUrl: latestManifestUrlOf(PACKAGE_NAME) }),
})

export const createLocalProcedureContext = (startedAt: Date, machine: LocalMachine): ProcedureContext => {
  const mockContext = createMockProcedureContext(startedAt)
  const setupStore = new FileSetupStore(machine.dataPath)
  const repositoryAdapterDependencies = {
    readRemote,
    openAdapter: assembleGitAdapter,
    readCredential: createForgeCredentialReader(readFromKeychain),
    environment: machine.environment,
  }
  const openRepository = createRepositoryAdapterOpener(repositoryAdapterDependencies)
  const inspector = new RepositoryInspector({ ...repositoryAdapterDependencies, now: () => new Date() })
  const readGitIdentity = createGitIdentityReader({ runCommand, environment: machine.environment })
  return {
    ...mockContext,
    setupStore,
    configurationStore: new FileConfigurationStore(machine.dataPath),
    reviewStore: new FileReviewStore(machine.dataPath, mockContext.reviewStore),
    pullRequestForge: createPullRequestForge({
      openRepository,
      readForges: async () => (await setupStore.read()).forges,
      now: () => new Date(),
    }),
    readInstructionTexts: new InstructionFileReader(machine.configurationsPath).read,
    writePublishedPage: createPublishedPageWriter({ bundlePath: machine.publishedBundlePath, dataPath: machine.dataPath }),
    importFiles: createImportFileStore(machine.dataPath),
    openTerminal: createTerminalOpener({ platform: machine.platform, runCommand, environment: machine.environment }),
    closeTerminal: createTerminalCloser({ platform: machine.platform, runCommand, environment: machine.environment }),
    appUrl: machine.appUrl,
    changeReader: createGitChangeReader({ runCommand, environment: machine.environment }),
    pullBranch: createBranchPuller({ runCommand, environment: machine.environment }),
    openRepository,
    conversationEnvironment: createConversationEnvironment({
      store: new FileConversationStore(machine.dataPath),
      serverUrl: machine.serverUrl,
    }),
    repositoryStore: new LiveRepositoryStore({
      setupStore,
      inspector,
      targetMemory: new FileTargetMemoryStore(machine.dataPath),
      readGitIdentity,
      now: () => new Date(),
    }),
    setupEnvironment: {
      ...mockContext.setupEnvironment,
      detectAgents: createAgentDetector(machine),
      hasAgentCli: createAgentCliProbe(machine),
      listAgentModels: createAgentModelLister(machine),
      installAgent: createAgentInstaller({ ...machine, runCommand }),
      isAgentInstallCurrent: createInstallChecker({ ...machine, runCommand }),
      probeForgeClis: createForgeCliProbe({ ...machine, runCommand }),
      saveForgeCredential: createForgeCredentialSaver(saveInKeychain),
      ...createAuthorLookup({
        readCommitAuthors: createCommitAuthorReader({
          runCommand,
          environment: machine.environment,
          commitLimit: COMMIT_LIMIT,
        }),
        openRepository,
      }),
      findRepositoryFolders: createRepositoryFolderFinder({ rootPath: machine.homePath, now: () => new Date() }),
      listFolders: createFolderLister(machine.homePath),
      readFolderEntries,
      isRepositoryFolder,
      findRepositoryForge: createRepositoryForgeFinder({ readRemote }),
      readGitIdentity,
      readRepositoryActivity: createRepositoryActivityReader({ runCommand, environment: machine.environment }),
    },
  }
}

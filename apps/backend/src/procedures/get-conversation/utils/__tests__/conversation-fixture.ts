import { createConversationEnvironment, type ProcedureContext } from "@/procedures/context"
import type { AgentProcess, AgentRegistry } from "@/procedures/get-conversation/utils/agent-registry"
import type { QuestionBatch, ReviewerMessage } from "@/procedures/get-conversation/utils/conversation"
import type {
  AgentExit,
  AgentLaunch,
  AgentSpawner,
  AgentSpawners,
  AgentStart,
  ConversationEnvironment,
} from "@/procedures/get-conversation/utils/conversation-environment"
import { createSetupContext, STOREFRONT } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { EMPTY_SETUP, type AgentsChoice, type Setup } from "@/procedures/get-setup/utils/setup"

export const KEY = { repositoryName: "storefront", targetId: "pr-412" } as const

export const SERVER_URL = "http://localhost:3000"

export const STARTED_AT = new Date("2026-10-03T12:00:00.000Z")

export const CLAUDE_AGENTS: AgentsChoice = {
  installs: [{ agent: "claude", installPath: "/Users/dev/.claude", model: "opus" }],
  defaultAgent: "claude",
  connection: "direct",
}

export const WITH_CLAUDE: Setup = { ...EMPTY_SETUP, agents: CLAUDE_AGENTS }

export class Clock {
  private current: Date

  public constructor(start: Date) {
    this.current = start
  }

  public readonly now = (): Date => this.current

  public readonly advance = (milliseconds: number): void => {
    this.current = new Date(this.current.getTime() + milliseconds)
  }
}

export class SequentialIds {
  private count = 0

  public readonly next = (): string => {
    this.count += 1
    return `id-${String(this.count)}`
  }
}

export class FakeProcess implements AgentProcess {
  public stopCount = 0
  private readonly onExit: (exit: AgentExit) => void
  private readonly output: string

  public constructor(onExit: (exit: AgentExit) => void, output: string) {
    this.onExit = onExit
    this.output = output
  }

  public readonly stop = (): void => {
    this.stopCount += 1
    this.onExit({ exitCode: 0 })
  }

  public readonly exit = (exitCode: number): void => {
    this.onExit({ exitCode })
  }

  public readonly readOutput = (): string => this.output
}

export class FakeSpawner {
  public launches: readonly AgentLaunch[] = []
  public processes: readonly FakeProcess[] = []
  private readonly start: AgentStart | null
  private readonly output: string

  public constructor(options: { readonly failure?: string, readonly output?: string } = {}) {
    this.start = options.failure === undefined ? null : { kind: "failed", reason: options.failure }
    this.output = options.output ?? ""
  }

  public readonly spawn: AgentSpawner = async (launch, onExit) => {
    this.launches = [...this.launches, launch]
    if (this.start !== null) return await Promise.resolve(this.start)
    const process = new FakeProcess(onExit, this.output)
    this.processes = [...this.processes, process]
    return await Promise.resolve({ kind: "started", process })
  }
}

export interface ConversationTestContext {
  readonly context: ProcedureContext
  readonly clock: Clock
  readonly spawner: FakeSpawner
  readonly environment: ConversationEnvironment
}

export interface ConversationContextOptions {
  readonly setup?: Setup
  readonly spawner?: FakeSpawner
  readonly spawners?: AgentSpawners
  readonly agents?: AgentRegistry
}

export const createConversationContext = (options: ConversationContextOptions = {}): ConversationTestContext => {
  const clock = new Clock(STARTED_AT)
  const ids = new SequentialIds()
  const spawner = options.spawner ?? new FakeSpawner()
  const environment = createConversationEnvironment({
    spawners: options.spawners ?? { claude: spawner.spawn },
    serverUrl: SERVER_URL,
    newId: ids.next,
    ...(options.agents === undefined ? {} : { agents: options.agents }),
  })
  const context: ProcedureContext = {
    ...createSetupContext(options.setup ?? WITH_CLAUDE, [STOREFRONT]),
    conversationEnvironment: environment,
    now: clock.now,
  }
  return { context, clock, spawner, environment }
}

export const reviewerMessage = (id: string, body: string): ReviewerMessage => ({
  kind: "reviewer-message",
  id,
  body,
  reference: null,
  sentAt: STARTED_AT,
})

export const agentQuestion = (id: string, origin: "agent" | "permission" = "agent"): QuestionBatch => ({
  kind: "question-batch",
  id,
  origin,
  questions: [
    {
      id: `${id}-1`,
      prompt: "How should I organise the walkthrough?",
      detail: null,
      options: [
        { label: "By feature", description: "One segment per feature." },
        { label: "By layer", description: "One segment per layer." },
      ],
      allowsMultiple: false,
    },
  ],
  askedAt: STARTED_AT,
})

export const flushPromises = async (): Promise<void> => {
  await new Promise((resolve) => {
    setImmediate(resolve)
  })
}

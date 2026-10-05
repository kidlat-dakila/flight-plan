import { execFile } from "node:child_process"
import { withoutParentSession } from "@/procedures/deliver-to-agent/utils/claude-launch"
import { AGENT_CLI_NAMES } from "@/procedures/get-setup/utils/agent-catalog"
import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import type { ListedModel } from "@/procedures/get-setup/utils/agent-models"
import {
  CLAUDE_MODEL_QUERY,
  CLAUDE_MODEL_QUERY_ARGUMENTS,
  parseClaudeModels,
} from "@/procedures/get-setup/utils/claude-model-query"
import type { AgentName } from "@/procedures/get-setup/utils/setup"
import type { SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { createExecutableFinder, type ExecutableFinder } from "@/utils/executable-finder"

export interface AgentModelListerOptions {
  readonly homePath: string
  readonly environment: Environment
  readonly timeoutMs?: number
}

type ModelListing = Promise<readonly ListedModel[]>

type ModelListings = Readonly<Partial<Record<AgentName, ModelListing | null>>>

type ModelQuery = (executable: string, environment: Environment, timeoutMs: number) => ModelListing

const DEFAULT_TIMEOUT_MS = 15_000
const NO_MODELS: readonly ListedModel[] = []

const ignoreClosedInput = (): void => undefined

const queryClaude: ModelQuery = async (executable, environment, timeoutMs) =>
  await new Promise((resolve) => {
    const child = execFile(
      executable,
      [...CLAUDE_MODEL_QUERY_ARGUMENTS],
      { env: { ...withoutParentSession(environment) }, timeout: timeoutMs },
      (_error, output) => {
        resolve(parseClaudeModels(output))
      },
    )
    child.stdin?.on("error", ignoreClosedInput)
    child.stdin?.end(CLAUDE_MODEL_QUERY)
  })

const MODEL_QUERIES: Partial<Record<AgentName, ModelQuery>> = { claude: queryClaude }

class AgentModelLister {
  private listings: ModelListings = {}
  private readonly findExecutable: ExecutableFinder
  private readonly options: AgentModelListerOptions

  public constructor(options: AgentModelListerOptions) {
    this.options = options
    this.findExecutable = createExecutableFinder(options)
  }

  public readonly list = async (agent: AgentName): ModelListing => {
    const cached = this.listings[agent] ?? null
    if (cached !== null) return await cached
    const listing = this.ask(agent)
    this.listings = { ...this.listings, [agent]: listing }
    const models = await listing
    if (models.length === 0 && this.listings[agent] === listing) this.listings = { ...this.listings, [agent]: null }
    return models
  }

  private readonly ask = async (agent: AgentName): ModelListing => {
    const query = MODEL_QUERIES[agent]
    if (query === undefined) return NO_MODELS
    const executable = await this.findExecutable(AGENT_CLI_NAMES[agent])
    if (executable === null) return NO_MODELS
    return await query(executable, this.options.environment, this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  }
}

export const createAgentModelLister = (options: AgentModelListerOptions): SetupEnvironment["listAgentModels"] =>
  new AgentModelLister(options).list

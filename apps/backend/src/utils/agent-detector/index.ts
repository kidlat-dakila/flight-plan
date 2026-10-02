import { agentFolders, type AgentFolder, type Environment } from "@/procedures/get-setup/utils/agent-folders"
import type { AgentDetection, SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { createAgentCliProbe } from "@/utils/executable-finder"
import { isFolder } from "@/utils/folder-lister"

export interface AgentDetectorOptions {
  readonly homePath: string
  readonly environment: Environment
}

export const createAgentDetector = (options: AgentDetectorOptions): SetupEnvironment["detectAgents"] => {
  const hasAgentCli = createAgentCliProbe(options)
  const detectAgent = async (folder: AgentFolder): Promise<AgentDetection> => {
    const [hasFolder, hasCli] = await Promise.all([isFolder(folder.path), hasAgentCli(folder.agent)])
    return { agent: folder.agent, installPath: hasFolder ? folder.path : null, hasCli }
  }
  return async () => await Promise.all(agentFolders(options.homePath, options.environment).map(detectAgent))
}

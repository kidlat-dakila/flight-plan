import type { ProcedureContext } from "@/procedures/context"
import { chooseWriter, type ChosenWriter } from "@/procedures/deliver-to-agent/utils/choose-writer"
import { chooseInstall } from "@/procedures/deliver-to-agent/utils/plan-delivery"
import { latestModelChoiceOf } from "@/procedures/get-conversation/utils/conversation"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { startableAgentsOf } from "@/procedures/get-review/utils/start/startable-agents"
import { offerModels, type ModelOffer } from "@/procedures/get-setup/utils/agent-models"
import { listModelsOf } from "@/procedures/get-setup/utils/list-agent-models"

export interface ChatWriter {
  readonly writer: ChosenWriter
  readonly offers: readonly ModelOffer[]
}

export const readChatWriter = async (key: ReviewKey, context: ProcedureContext): Promise<ChatWriter | null> => {
  const [setup, conversation, request] = await Promise.all([
    context.setupStore.read(),
    context.conversationEnvironment.store.read(key),
    context.reviewStore.findRequest(key),
  ])
  const startableAgents = startableAgentsOf(context.conversationEnvironment.spawners)
  const install = setup.agents === null ? null : chooseInstall(setup.agents, startableAgents)
  if (install === null) return null
  const writer = chooseWriter(install, request, latestModelChoiceOf(conversation.journal, install.agent))
  const agentModels = await listModelsOf([install.agent], context.setupEnvironment)
  return { writer, offers: offerModels(install.agent, agentModels, writer.install.model) }
}

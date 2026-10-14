import type { ModelChoice } from "@/procedures/get-conversation/utils/conversation"
import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import type { AgentInstall } from "@/procedures/get-setup/utils/setup"

export interface ChosenWriter {
  readonly install: AgentInstall
  readonly effort: string
}

const writerOfRequest = (install: AgentInstall, request: ReviewRequest | null): ChosenWriter =>
  request?.writer.kind === "agent" && request.writer.agent === install.agent
    ? { install: { ...install, model: request.writer.model }, effort: request.writer.effort }
    : { install, effort: install.effort }

export const chooseWriter = (
  install: AgentInstall,
  request: ReviewRequest | null,
  modelChoice: ModelChoice | null,
): ChosenWriter =>
  modelChoice?.agent === install.agent
    ? { install: { ...install, model: modelChoice.model }, effort: modelChoice.effort }
    : writerOfRequest(install, request)

import type { StartForm } from "@/procedures/get-review/utils/schemas"
import { MANUAL_WRITER } from "@/procedures/get-review/utils/start/agent-offers"
import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import type { RebuildMode } from "@/procedures/rebuild-review/utils/schemas"
import type { RebuildForm } from "./schemas"

export interface RebuildFormSource {
  readonly mode: RebuildMode
  readonly startForm: StartForm
  readonly request: ReviewRequest | null
  readonly commit: string
}

type AgentOption = StartForm["writer"]["agents"][number]

const SHORT_COMMIT_LENGTH = 7
const UPDATE: RebuildMode = "update"
const BUILD_SENTENCE = "Flight Plan pulls the branch and builds the review again from its latest commit."
const REWRITE_NOTICE = "A different configuration is a total rewrite: nothing the agent wrote is kept."

const TITLES: Readonly<Record<RebuildMode, string>> = {
  update: "Update the Flight Plan",
  regenerate: "Regenerate from scratch",
}

const descriptionOf = (mode: RebuildMode, commit: string): string =>
  mode === UPDATE
    ? `${BUILD_SENTENCE} What the agent wrote for code that has not changed since commit ${commit.slice(0, SHORT_COMMIT_LENGTH)} is kept, and the agent writes the rest.`
    : `${BUILD_SENTENCE} Everything the agent wrote is erased, and the agent writes all of it again.`

const withStoredChoice = (option: AgentOption, { writer }: ReviewRequest): AgentOption => {
  if (writer.kind !== "agent" || writer.agent !== option.agent) return option
  const model = option.modelOptions.find((offer) => offer.model === writer.model)
  if (model === undefined) return option
  const hasEffort = model.effortOptions.some((offer) => offer.effort === writer.effort)
  return { ...option, selectedModel: model.model, selectedEffort: hasEffort ? writer.effort : model.selectedEffort }
}

const writerKeyOf = (form: StartForm, { writer }: ReviewRequest): StartForm["writer"]["selectedKey"] => {
  if (writer.kind !== "agent") return MANUAL_WRITER
  const option = form.writer.agents.find((candidate) => candidate.agent === writer.agent)
  return option?.unavailableReason === null ? option.agent : form.writer.selectedKey
}

const withStoredChoices = (form: StartForm, request: ReviewRequest | null): StartForm =>
  request === null
    ? form
    : {
        ...form,
        configuration: { ...form.configuration, selectedConfigurationId: request.configurationId },
        order: { ...form.order, selectedOrder: request.order, customOrder: request.customOrder ?? "" },
        writer: {
          ...form.writer,
          selectedKey: writerKeyOf(form, request),
          agents: form.writer.agents.map((option) => withStoredChoice(option, request)),
        },
      }

const withRebuildWording = (form: StartForm, { mode, request }: RebuildFormSource): StartForm => ({
  ...form,
  configuration: {
    ...form.configuration,
    options: form.configuration.options.map((option) => ({
      ...option,
      rewriteNotice: mode === UPDATE && request !== null && option.configurationId !== request.configurationId ? REWRITE_NOTICE : null,
    })),
  },
  writer: { ...form.writer, agents: form.writer.agents.map((option) => ({ ...option, submitLabel: TITLES[mode] })) },
})

export const buildRebuildForm = (source: RebuildFormSource): RebuildForm => ({
  title: TITLES[source.mode],
  description: descriptionOf(source.mode, source.commit),
  form: withRebuildWording(withStoredChoices(source.startForm, source.request), source),
})

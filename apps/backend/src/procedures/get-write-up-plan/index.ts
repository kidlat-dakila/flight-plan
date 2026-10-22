import type { ProcedureContext } from "@/procedures/context"
import { LIVE_AGENTS } from "@/procedures/get-review/utils/start/live-agents"
import { isWriteUpOffered } from "@/procedures/get-review/utils/start/review-request"
import { reviewPreferencesOf, WRITE_UP_SECTIONS, type ReviewPreferences, type WriteUpSection } from "@/procedures/get-review-preferences/utils/review-preferences"
import { listConfigurationsOf } from "@/procedures/list-configurations/utils/configuration"
import { BASE_PRESET_NAME } from "@flightplan/configurations"
import { buildWriteUpPlan } from "./utils/build-write-up-plan"
import { defaultWriterOf } from "./utils/default-writer"
import type { GetWriteUpPlanInput, WriteUpPlan } from "./utils/schemas"
import { writeUpCountsOf } from "./utils/write-up-counts"

export const NO_AGENT_MESSAGE = "No agent is set up, so no agent can explain this review. Set one up in the settings."

export const alwaysWrittenSectionsOf = (preferences: ReviewPreferences): WriteUpSection[] =>
  WRITE_UP_SECTIONS.filter((section) => preferences.sectionWriteUps[section] === "always")

export const getWriteUpPlan = async (input: GetWriteUpPlanInput, context: ProcedureContext): Promise<WriteUpPlan | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [artifact, request, setup, savedConfigurations] = await Promise.all([
    context.reviewStore.findArtifact(key),
    context.reviewStore.findRequest(key),
    context.setupStore.read(),
    context.configurationStore.read(),
  ])
  if (artifact === null) return null
  const writer = defaultWriterOf(setup.agents, LIVE_AGENTS)
  if (writer === null) return { kind: "no-agent", message: NO_AGENT_MESSAGE }
  const preferences = reviewPreferencesOf(setup.reviewPreferences)
  return buildWriteUpPlan({
    isOffered: isWriteUpOffered(request),
    agent: writer.agent,
    agentLabel: writer.label,
    counts: writeUpCountsOf(artifact),
    sections: input.sections ?? request?.writeUp?.sections ?? alwaysWrittenSectionsOf(preferences),
    configurations: listConfigurationsOf(savedConfigurations),
    configurationId: request?.configurationId ?? setup.defaultConfiguration ?? BASE_PRESET_NAME,
    walkthroughOrder: request?.writeUp?.walkthroughOrder ?? preferences.walkthroughOrder,
    isSegmented: artifact.isSegmented,
  })
}

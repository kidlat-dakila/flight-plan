import type { ProcedureContext } from "@/procedures/context"
import { startableAgentsOf } from "@/procedures/get-review/utils/start/startable-agents"
import { reviewPreferencesOf, WRITE_UP_SECTIONS, type ReviewPreferences, type WriteUpSection } from "@/procedures/get-review-preferences/utils/review-preferences"
import { listConfigurationsOf } from "@/procedures/list-configurations/utils/configuration"
import { BASE_PRESET_NAME } from "@flightplan/configurations"
import { buildWriteUpPlan } from "./utils/build-write-up-plan"
import { defaultWriterOf } from "./utils/default-writer"
import type { GetWriteUpPlanInput, WriteUpPlan } from "./utils/schemas"
import { writeUpCountsOf } from "./utils/write-up-counts"

export const NO_AGENT_MESSAGE = "No agent is set up, so no agent can write this review up. Set one up in the settings."

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
  const writer = defaultWriterOf(setup.agents, startableAgentsOf(context.conversationEnvironment.spawners))
  if (writer === null) return { kind: "no-agent", message: NO_AGENT_MESSAGE }
  const preferences = reviewPreferencesOf(setup.reviewPreferences)
  return buildWriteUpPlan({
    agentLabel: writer.label,
    counts: writeUpCountsOf(artifact),
    sections: input.sections ?? request?.writeUp?.sections ?? alwaysWrittenSectionsOf(preferences),
    configurations: listConfigurationsOf(savedConfigurations),
    configurationId: request?.configurationId ?? setup.defaultConfiguration ?? BASE_PRESET_NAME,
    walkthroughOrder: request?.writeUp?.walkthroughOrder ?? preferences.walkthroughOrder,
    isSegmented: artifact.isSegmented,
  })
}

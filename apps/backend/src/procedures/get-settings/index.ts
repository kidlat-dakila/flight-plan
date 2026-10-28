import type { SelectedAuthors } from "@/procedures/add-repository/utils/find-selected-authors"
import type { ProcedureContext } from "@/procedures/context"
import { buildAgentsStep } from "@/procedures/get-setup/utils/build-agents-step"
import { buildForgesStep } from "@/procedures/get-setup/utils/build-forges-step"
import { listOfferedModels } from "@/procedures/get-setup/utils/list-agent-models"
import { resolveBaseBranch } from "@/procedures/get-setup/utils/repository-base-branches"
import type { Setup } from "@/procedures/get-setup/utils/setup"
import { listConfigurationsOf } from "@/procedures/list-configurations/utils/configuration"
import { buildRepositoriesSection, type RepositoryFollowing } from "./utils/build-repositories-section"
import { buildReviewSection } from "./utils/build-review-section"
import type { GetSettingsInput, SettingsPage } from "./utils/schemas"
import type { SettingsSection } from "./utils/settings-section"
import { toAgentsSection, toForgesSection } from "./utils/step-sections"

type SectionReader = (setup: Setup, context: ProcedureContext) => Promise<SettingsPage>

const NO_AUTHORS: SelectedAuthors = { selfAuthor: null, trackedAuthors: [] }

const readAgentsSection: SectionReader = async (setup, context) => {
  const [agentDetections, terminalApps] = await Promise.all([
    context.setupEnvironment.detectAgents(),
    context.setupEnvironment.detectTerminalApps(),
  ])
  const agentModels = await listOfferedModels(agentDetections, setup.agents, context.setupEnvironment)
  return toAgentsSection(buildAgentsStep(setup.agents, agentDetections, agentModels, terminalApps))
}

const readForgesSection: SectionReader = async (setup, context) =>
  toForgesSection(buildForgesStep(setup.forges, await context.setupEnvironment.probeForgeClis()))

const readFollowings = async (setup: Setup, context: ProcedureContext): Promise<readonly RepositoryFollowing[]> => {
  const repositories = await context.repositoryStore.listRegistered()
  return await Promise.all(
    repositories.map(async (repository) => {
      const [authors, forge, identity, baseBranch] = await Promise.all([
        context.repositoryStore.readAuthors(repository.name),
        context.setupEnvironment.findRepositoryForge(repository.path, setup.forges),
        context.setupEnvironment.readGitIdentity(repository.path),
        resolveBaseBranch(repository, context.setupEnvironment),
      ])
      return { repository: { ...repository, baseBranch }, authors: authors ?? NO_AUTHORS, forge, identity }
    }),
  )
}

const readRepositoriesSection: SectionReader = async (setup, context) =>
  buildRepositoriesSection(await readFollowings(setup, context))

const readReviewSection: SectionReader = async (setup, context) =>
  buildReviewSection(setup, listConfigurationsOf(await context.configurationStore.read()))

const SECTION_READERS: Record<SettingsSection, SectionReader> = {
  agents: readAgentsSection,
  forges: readForgesSection,
  repositories: readRepositoriesSection,
  review: readReviewSection,
}

export const getSettings = async (input: GetSettingsInput, context: ProcedureContext): Promise<SettingsPage> => {
  const setup = await context.setupStore.read()
  return await SECTION_READERS[input.section](setup, context)
}

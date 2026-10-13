import type { ProcedureContext } from "@/procedures/context"
import { findReviewTarget } from "@/procedures/get-review/utils/find-review-target"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import type { ReviewWriter } from "@/procedures/get-review/utils/start/review-request"
import { sectionsOf } from "@/procedures/read-artifact/utils/artifact-sections"
import { sendToAgent } from "@/procedures/request-review"
import { buildArtifactAt, type ArtifactBuilding } from "@/procedures/request-review/utils/build-artifact"
import { SECTION_LABELS, type ReviewArtifact, type SectionName } from "@flightplan/configurations"
import { buildGenerationPrompt } from "./utils/generation-prompt"
import { isDiagramSection, planGeneration } from "./utils/plan-generation"
import type { GenerateSectionInput, GenerateSectionResult } from "./utils/schemas"

const PROMPT_COPIED_MESSAGE = "Prompt copied"

const NO_SCAFFOLD: ArtifactBuilding = {
  kind: "unavailable",
  message: "This Flight Plan does not say which commits it compares, so its diagram cannot be built. Build the Flight Plan again.",
}

const upperFirst = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

const generatedMessage = (section: SectionName): string => `${upperFirst(SECTION_LABELS[section])} generated`

const startedMessage = (section: SectionName): string => `Writing the ${SECTION_LABELS[section]}`

const unstartedMessage = (section: SectionName, reason: string): string =>
  `The ${SECTION_LABELS[section]} is ready to write, but the agent did not start: ${reason}`

const alreadyGenerated = (section: SectionName): GenerateSectionResult => ({
  kind: "unavailable",
  message: `The ${SECTION_LABELS[section]} is already generated.`,
})

interface Handover {
  readonly key: ReviewKey
  readonly section: SectionName
  readonly writer: ReviewWriter | null
  readonly prompt: string
}

const handToWriter = async ({ key, section, writer, prompt }: Handover, context: ProcedureContext): Promise<GenerateSectionResult> => {
  if (writer === null || writer.kind === "author") return { kind: "generated", prompt: null, message: generatedMessage(section) }
  if (writer.kind === "manual") return { kind: "generated", prompt, message: PROMPT_COPIED_MESSAGE }
  const outcome = await sendToAgent(key, prompt, context)
  return {
    kind: "generated",
    prompt: null,
    message: outcome.kind === "failed" || outcome.kind === "unavailable" ? unstartedMessage(section, outcome.reason) : startedMessage(section),
  }
}

interface Rebuilding {
  readonly repositoryPath: string
  readonly artifact: ReviewArtifact
  readonly baseCommit: string | null
}

const rebuildAt = async ({ repositoryPath, artifact, baseCommit }: Rebuilding, context: ProcedureContext): Promise<ArtifactBuilding> => {
  if (baseCommit === null) return NO_SCAFFOLD
  const setup = await context.setupStore.read()
  const opened = await context.openRepository(repositoryPath, setup.forges)
  return await buildArtifactAt(opened.resolved, {
    baseCommit,
    headCommit: artifact.commit,
    title: artifact.title,
    newId: context.conversationEnvironment.newId,
  })
}

export const generateSection = async (
  input: GenerateSectionInput,
  context: ProcedureContext,
): Promise<GenerateSectionResult | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const { section } = input
  const [repositories, artifact, scaffold] = await Promise.all([
    context.repositoryStore.list(),
    context.reviewStore.findArtifact(key),
    context.reviewStore.readScaffold(key),
  ])
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  if (repository === undefined || artifact === null) return null
  if (sectionsOf(artifact)[section]) return alreadyGenerated(section)
  const target = await findReviewTarget(repository, input.targetId, context)
  if (target === null) return null
  const building = isDiagramSection(section)
    ? await rebuildAt({ repositoryPath: repository.path, artifact, baseCommit: scaffold?.baseCommit ?? null }, context)
    : null
  if (building?.kind === "unavailable") return building
  const writer = scaffold?.request.writer ?? null
  const wasGenerated = await context.reviewStore.amendArtifact<boolean>(key, (stored) =>
    sectionsOf(stored)[section]
      ? { artifact: null, outcome: false }
      : { artifact: planGeneration(stored, { section, rebuilt: building?.artifact ?? null, writer }), outcome: true })
  if (wasGenerated === null) return null
  if (!wasGenerated) return alreadyGenerated(section)
  return await handToWriter({ key, section, writer, prompt: buildGenerationPrompt(repository, target, key, section) }, context)
}

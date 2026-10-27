import type { ProcedureContext } from "@/procedures/context"
import { reviewPreferencesOf } from "@/procedures/get-review-preferences/utils/review-preferences"
import { defaultConfigurationIdOf } from "@/procedures/get-setup/utils/default-configuration"
import { DEFAULT_PRESET } from "@/procedures/get-setup/utils/preset-catalog"
import { findConfiguration, shippedConfigurationOf, type Configuration, type SavedConfiguration } from "@/procedures/list-configurations/utils/configuration"
import { buildArtifact } from "@/procedures/request-review/utils/build-artifact"
import { startingArtifactOf } from "@/procedures/request-review/utils/starting-artifact"
import type { BranchReviewArtifact } from "@flightplan/codegraph"
import type { ReviewArtifact } from "@flightplan/configurations"
import { targetTitleOf } from "./build-shell"
import { branchNameOf } from "./change-reader"
import type { ReviewKey } from "./review-store"
import type { ReviewSubject } from "./review-subject"
import { DEFAULT_ORDER, type ReviewWriter } from "./start/review-request"
import type { ReviewScaffold } from "./stored-review"

export type ArtifactOpening
  = | { readonly kind: "built", readonly artifact: ReviewArtifact }
    | { readonly kind: "unavailable", readonly message: string }

export interface OpeningChoices {
  readonly isOwn: boolean
  readonly configuration: Configuration
  readonly now: Date
}

const AUTHOR_WRITER: ReviewWriter = { kind: "author", start: "scaffold" }
const NO_WRITER: ReviewWriter = { kind: "none" }
const COMPLETE_STATUS = "complete"

const writerOf = (isOwn: boolean): ReviewWriter => (isOwn ? AUTHOR_WRITER : NO_WRITER)

export const openingScaffoldOf = (built: BranchReviewArtifact, { isOwn, configuration, now }: OpeningChoices): ReviewScaffold => {
  const writer = writerOf(isOwn)
  const starting = startingArtifactOf(built.artifact, writer, { requiredContextKinds: configuration.contextCodeBlockKinds })
  return {
    artifact: isOwn ? starting : { ...starting, status: COMPLETE_STATUS },
    request: {
      configurationId: configuration.id,
      preset: configuration.preset,
      order: DEFAULT_ORDER,
      customOrder: null,
      writer,
      requestedAt: now,
    },
    baseCommit: built.baseCommit,
  }
}

export const defaultConfigurationOf = (configurationId: string, saved: readonly SavedConfiguration[]): Configuration =>
  findConfiguration(saved, configurationId) ?? shippedConfigurationOf(DEFAULT_PRESET)

export const isOpenedWithoutArtifact = (subject: ReviewSubject): boolean => subject.isStored && subject.artifact === null

export const buildOpeningArtifact = async (subject: ReviewSubject, key: ReviewKey, context: ProcedureContext): Promise<ArtifactOpening> => {
  const [setup, savedConfigurations] = await Promise.all([context.setupStore.read(), context.configurationStore.read()])
  const opened = await context.openRepository(subject.repository.path, setup.forges, subject.repository.baseBranch)
  const preferences = reviewPreferencesOf(setup.reviewPreferences)
  const building = await buildArtifact(opened.resolved, {
    branchName: branchNameOf(subject.target),
    title: targetTitleOf(subject.target),
    newId: context.conversationEnvironment.newId,
    ignoredPaths: preferences.ignoredPaths,
    isSegmented: preferences.isSegmented,
  })
  if (building.kind === "unavailable") return building
  const scaffold = openingScaffoldOf(building, {
    isOwn: subject.isOwn,
    configuration: defaultConfigurationOf(defaultConfigurationIdOf(setup), savedConfigurations),
    now: context.now(),
  })
  await context.reviewStore.writeScaffold(key, scaffold)
  return { kind: "built", artifact: scaffold.artifact }
}

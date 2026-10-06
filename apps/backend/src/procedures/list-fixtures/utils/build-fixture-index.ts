import { buildRepositoryLine } from "@/procedures/list-repositories/utils/build-repository-index"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import type {
  FixtureIndex,
  RepositoryLine,
  RepositoryLineContent,
  ReviewTargetStop,
} from "@/procedures/list-repositories/utils/schemas"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"

const CASE_SELECT_LABEL = "Test case"
const REVIEWS_PATH = "/pr-reviews"

export const snapshotNameOf = (target: ReviewTarget): string => (target.kind === "pull-request" ? target.branch : target.name)

const snapshotNamesByTargetId = (repository: Repository): ReadonlyMap<string, string> =>
  new Map(repository.targets.map((target) => [targetIdOf(target), snapshotNameOf(target)]))

const snapshotHref = (caseName: string, snapshotName: string): string =>
  `${REVIEWS_PATH}/${encodeURIComponent(caseName)}/${encodeURIComponent(snapshotName)}`

const toSnapshotStop = (stop: ReviewTargetStop, caseName: string, snapshotNames: ReadonlyMap<string, string>): ReviewTargetStop => {
  const snapshotName = snapshotNames.get(stop.id) ?? stop.id
  return { ...stop, id: snapshotName, href: snapshotHref(caseName, snapshotName) }
}

const withSnapshotStops = (content: RepositoryLineContent, repository: Repository): RepositoryLineContent => {
  if (content.kind !== "targets") return content
  const snapshotNames = snapshotNamesByTargetId(repository)
  return { ...content, targets: content.targets.map((stop) => toSnapshotStop(stop, repository.name, snapshotNames)) }
}

const buildFixtureLine = (repository: Repository, position: number, now: Date): RepositoryLine => {
  const line = buildRepositoryLine(repository, position, now)
  return { ...line, content: withSnapshotStops(line.content, repository) }
}

export const chooseCaseName = (caseNames: readonly string[], requestedName: string | null): string | null =>
  caseNames.find((caseName) => caseName === requestedName) ?? caseNames.at(0) ?? null

export const buildFixtureIndex = (caseNames: readonly string[], repository: Repository, now: Date): FixtureIndex => ({
  caseSelect: {
    label: CASE_SELECT_LABEL,
    value: repository.name,
    options: caseNames.map((caseName) => ({ value: caseName, label: caseName })),
  },
  repository: buildFixtureLine(repository, Math.max(caseNames.indexOf(repository.name), 0), now),
})

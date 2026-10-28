import type { ProcedureContext } from "@/procedures/context"
import { reviewPreferencesOf } from "@/procedures/get-review-preferences/utils/review-preferences"
import { isIgnoredPath } from "@flightplan/codegraph"
import type { ComparedChange, DefaultBaseBranch } from "./build-creation"
import { branchNameOf, type ChangeReader, type ChangeRevision } from "./change-reader"
import { readDefaultBaseBranch } from "./default-base-branch"
import { fileChangesOf } from "./diff-stats"
import type { ReviewSubject } from "./review-subject"

export type CreationReading
  = | { readonly kind: "unreadable" }
    | {
      readonly kind: "compared"
      readonly compareBranch: string | null
      readonly defaultBranch: DefaultBaseBranch
      readonly change: ComparedChange
    }

interface ComparedBranches {
  readonly repositoryPath: string
  readonly branchName: string
  readonly compareBranch: string | null
  readonly ignoredPaths: readonly string[]
}

const UNREADABLE: CreationReading = { kind: "unreadable" }
const NAMELESS_BASE_LABEL = "the base branch"

const branchLabelOf = (branchName: string | null): string => (branchName === null ? NAMELESS_BASE_LABEL : `“${branchName}”`)

const problem = (message: string): ComparedChange => ({ kind: "problem", message })

const missingBaseProblemOf = (branchName: string | null): ComparedChange =>
  problem(`The branch ${branchLabelOf(branchName)} is not in this checkout. Fetch it or choose another branch.`)

const noCommitsProblemOf = (branchName: string | null): ComparedChange =>
  problem(`This branch has no commits after ${branchLabelOf(branchName)}.`)

const ALL_IGNORED_MESSAGE = "Every changed file is ignored by your review preferences, so there is nothing to review."

export const comparedChangeOf = (diff: string | null, compareBranch: string | null, ignoredPaths: readonly string[]): ComparedChange => {
  if (diff === null) return problem(`Flight Plan could not read the change against ${branchLabelOf(compareBranch)}.`)
  const changedFiles = fileChangesOf(diff)
  if (changedFiles.length === 0) return problem(`Nothing changed against ${branchLabelOf(compareBranch)}, so there is nothing to review.`)
  const files = changedFiles.filter((file) => !isIgnoredPath(ignoredPaths, file.path))
  return files.length === 0 ? problem(ALL_IGNORED_MESSAGE) : { kind: "read", files }
}

const isHeadReadable = async (changeReader: ChangeReader, branches: ComparedBranches): Promise<boolean> =>
  branches.compareBranch !== null && (await changeReader.findRevision(branches.repositoryPath, branches.branchName, null)) !== null

const readRevisionChange = async (changeReader: ChangeReader, branches: ComparedBranches, revision: ChangeRevision): Promise<ComparedChange> =>
  revision.headCommit === revision.baseCommit
    ? noCommitsProblemOf(branches.compareBranch)
    : comparedChangeOf(await changeReader.readDiff(branches.repositoryPath, revision), branches.compareBranch, branches.ignoredPaths)

const readComparedChange = async (changeReader: ChangeReader, branches: ComparedBranches): Promise<ComparedChange | null> => {
  const revision = await changeReader.findRevision(branches.repositoryPath, branches.branchName, branches.compareBranch)
  if (revision !== null) return await readRevisionChange(changeReader, branches, revision)
  return (await isHeadReadable(changeReader, branches)) ? missingBaseProblemOf(branches.compareBranch) : null
}

export const readCreation = async (
  subject: Pick<ReviewSubject, "repository" | "target">,
  requestedBranch: string | null,
  context: Pick<ProcedureContext, "changeReader" | "openRepository" | "setupStore" | "setupEnvironment">,
): Promise<CreationReading> => {
  const [defaultBranch, setup] = await Promise.all([readDefaultBaseBranch(subject.repository, subject.target, context), context.setupStore.read()])
  const compareBranch = requestedBranch ?? defaultBranch.branchName
  const change = await readComparedChange(context.changeReader, {
    repositoryPath: subject.repository.path,
    branchName: branchNameOf(subject.target),
    compareBranch,
    ignoredPaths: reviewPreferencesOf(setup.reviewPreferences).ignoredPaths,
  })
  return change === null ? UNREADABLE : { kind: "compared", compareBranch, defaultBranch, change }
}

import type { ChangeReader, ChangeRevision } from "@/procedures/get-review/utils/change-reader"
import { type ChangeSnapshot, parseHunks } from "@flightplan/codegraph"

export type ChangeReading
  = | { readonly kind: "read", readonly revision: ChangeRevision, readonly snapshot: ChangeSnapshot }
    | { readonly kind: "unavailable", readonly message: string }

const UNKNOWN_BRANCH_MESSAGE
  = "Flight Plan cannot find this branch, or the main branch, in the repository folder. Fetch them and try again."
const UNREADABLE_DIFF_MESSAGE = "Flight Plan could not read the diff of this change. Fetch the branch and try again."
const NO_CHANGE_MESSAGE = "This change touches no files, so there is nothing to review."

const unavailable = (message: string): ChangeReading => ({ kind: "unavailable", message })

export const readChange = async (
  changeReader: ChangeReader,
  repositoryPath: string,
  branchName: string,
  title: string,
): Promise<ChangeReading> => {
  const revision = await changeReader.findRevision(repositoryPath, branchName)
  if (revision === null) return unavailable(UNKNOWN_BRANCH_MESSAGE)
  const diff = await changeReader.readDiff(repositoryPath, revision)
  if (diff === null) return unavailable(UNREADABLE_DIFF_MESSAGE)
  const hunks = parseHunks(diff)
  const paths = Object.keys(hunks)
  if (paths.length === 0) return unavailable(NO_CHANGE_MESSAGE)
  const texts = await Promise.all(
    paths.map(async (path) => [path, await changeReader.readFile(repositoryPath, revision.headCommit, path)] as const),
  )
  return {
    kind: "read",
    revision,
    snapshot: { title, headCommit: revision.headCommit, hunks, texts: new Map(texts) },
  }
}

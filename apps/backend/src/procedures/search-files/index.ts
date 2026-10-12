import type { ProcedureContext } from "@/procedures/context"
import type { ReviewArtifact } from "@flightplan/configurations"
import type { FileSearchScope, FileSuggestions, SearchFilesInput } from "./utils/schemas"
import { selectFiles } from "./utils/select-files"

const RESULT_LIMIT = 50

const readRepositoryPaths = async (
  repositoryPath: string,
  commit: string,
  scope: FileSearchScope,
  context: Pick<ProcedureContext, "changeReader">,
): Promise<readonly string[]> =>
  scope === "repository" ? await context.changeReader.listPaths(repositoryPath, commit) ?? [] : []

const unchangedPathsOf = (artifact: ReviewArtifact, repositoryPaths: readonly string[]): string[] => {
  const changedPaths = new Set(artifact.changedPaths)
  const paths = new Set([...artifact.sources.map((source) => source.path), ...repositoryPaths])
  return [...paths].filter((path) => !changedPaths.has(path)).sort((one, two) => one.localeCompare(two))
}

export const searchFiles = async (input: SearchFilesInput, context: ProcedureContext): Promise<FileSuggestions | null> => {
  const [repositories, artifact] = await Promise.all([
    context.repositoryStore.list(),
    context.reviewStore.findArtifact({ repositoryName: input.repositoryName, targetId: input.targetId }),
  ])
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  if (repository === undefined || artifact === null) return null
  const repositoryPaths = await readRepositoryPaths(repository.path, artifact.commit, input.scope, context)
  return selectFiles({
    changedPaths: artifact.changedPaths,
    unchangedPaths: input.scope === "changed" ? [] : unchangedPathsOf(artifact, repositoryPaths),
    query: input.query,
    limit: RESULT_LIMIT,
  })
}

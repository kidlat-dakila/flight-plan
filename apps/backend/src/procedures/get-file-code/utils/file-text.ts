import type { ProcedureContext } from "@/procedures/context"
import type { ReviewArtifact, SourceFile } from "@flightplan/configurations"

export interface FileLocation {
  readonly repositoryName: string
  readonly path: string
}

const LINE_BREAK = "\n"

export const heldTextOf = (source: SourceFile): string =>
  source.lines.filter((line) => line.number !== null).map((line) => line.text).join(LINE_BREAK)

const readRepositoryText = async (
  { repositoryName, path }: FileLocation,
  commit: string,
  context: Pick<ProcedureContext, "repositoryStore" | "changeReader">,
): Promise<string | null> => {
  const repositories = await context.repositoryStore.list()
  const repository = repositories.find((candidate) => candidate.name === repositoryName)
  return repository === undefined ? null : await context.changeReader.readFile(repository.path, commit, path)
}

export const readFileText = async (
  location: FileLocation,
  artifact: ReviewArtifact,
  context: Pick<ProcedureContext, "repositoryStore" | "changeReader">,
): Promise<string | null> => {
  const source = artifact.sources.find((candidate) => candidate.path === location.path)
  return source === undefined ? await readRepositoryText(location, artifact.commit, context) : heldTextOf(source)
}

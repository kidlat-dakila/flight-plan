import type { ProcedureContext } from "@/procedures/context"
import { languageOf } from "@flightplan/codegraph"
import type { ReviewArtifact } from "@flightplan/configurations"
import { heldLinesOf, textLinesOf, toCodeLines, type FileLine } from "./utils/file-lines"
import type { FileCode, GetFileCodeInput } from "./utils/schemas"

const readRepositoryLines = async (
  input: GetFileCodeInput,
  commit: string,
  context: Pick<ProcedureContext, "repositoryStore" | "changeReader">,
): Promise<readonly FileLine[] | null> => {
  const repositories = await context.repositoryStore.list()
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  if (repository === undefined) return null
  const text = await context.changeReader.readFile(repository.path, commit, input.path)
  return text === null ? null : textLinesOf(text)
}

const readFileLines = async (
  input: GetFileCodeInput,
  artifact: ReviewArtifact,
  context: Pick<ProcedureContext, "repositoryStore" | "changeReader">,
): Promise<readonly FileLine[] | null> => {
  const source = artifact.sources.find((candidate) => candidate.path === input.path)
  return source === undefined ? await readRepositoryLines(input, artifact.commit, context) : heldLinesOf(source)
}

export const getFileCode = async (input: GetFileCodeInput, context: ProcedureContext): Promise<FileCode | null> => {
  const artifact = await context.reviewStore.findArtifact({
    repositoryName: input.repositoryName,
    targetId: input.targetId,
  })
  if (artifact === null) return null
  const lines = await readFileLines(input, artifact, context)
  if (lines === null) return null
  const tokenLines = await context.highlightCode(lines.map((line) => line.text), languageOf(input.path))
  return { path: input.path, lines: toCodeLines(lines, tokenLines) }
}

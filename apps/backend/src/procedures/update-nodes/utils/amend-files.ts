import type { Segment } from "@flightplan/configurations"
import { idProblemOf, refuse, type SegmentsOutcome } from "./refusal"
import type { FileEdit } from "./schemas"

const amendSegment = (segment: Segment, editByPath: ReadonlyMap<string, FileEdit>): Segment => ({
  ...segment,
  walkthrough: {
    ...segment.walkthrough,
    files: segment.walkthrough.files.map((file) => {
      const edit = editByPath.get(file.path)
      return edit === undefined
        ? file
        : { ...file, title: edit.title ?? file.title, summary: edit.summary ?? file.summary }
    }),
  },
})

export const fileTextsOf = (edits: readonly FileEdit[]): string[] => edits.flatMap((edit) => edit.summary ?? [])

export const amendFiles = (segments: readonly Segment[], edits: readonly FileEdit[]): SegmentsOutcome => {
  const knownPaths = segments.flatMap((segment) => segment.walkthrough.files.map((file) => file.path))
  const idProblem = idProblemOf("File Section", edits.map((edit) => edit.path), knownPaths)
  if (idProblem !== null) return refuse(idProblem)
  const editByPath = new Map(edits.map((edit) => [edit.path, edit]))
  return { kind: "amended", segments: segments.map((segment) => amendSegment(segment, editByPath)) }
}

import type { ReviewArtifact } from "@flightplan/configurations"
import { countLabel } from "./count-label"
import type { UnassignedFiles } from "./schemas"

export const unassignedPathsOf = (artifact: ReviewArtifact): string[] => {
  const assignedPaths = new Set(artifact.segments.flatMap((segment) => segment.changedPaths))
  return artifact.changedPaths.filter((path) => !assignedPaths.has(path))
}

const verbFor = (count: number): string => (count === 1 ? "is" : "are")

export const buildUnassignedFiles = (artifact: ReviewArtifact): UnassignedFiles | null => {
  const paths = unassignedPathsOf(artifact)
  if (paths.length === 0) return null
  const changedFiles = countLabel(paths.length, "changed file", "changed files")
  return {
    label: `${countLabel(paths.length, "file", "files")} in no segment`,
    message: `${changedFiles} ${verbFor(paths.length)} in no segment of this Flight Plan.`,
    actionLabel: "Show the files",
    title: "Changed files in no segment",
    description: "No segment of this Flight Plan holds these changed files, so nothing in it describes them.",
    publishWarning: `${changedFiles} ${verbFor(paths.length)} in no segment. The reviewer is told so when they open the Flight Plan.`,
    paths,
  }
}

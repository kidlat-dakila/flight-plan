import { z } from "zod"
import { ARTIFACT_SECTIONS } from "./project-artifact"

export const reviewTargetShape = {
  repositoryName: z.string().min(1).describe("The repository's name in Flight Plan."),
  targetId: z.string().min(1).describe("pr-<number> for a pull request, branch-<name> for a branch."),
}

export const segmentIdShape = z
  .string()
  .min(1)
  .optional()
  .describe("Only for an artifact the reviewer split into segments: the segment this call is about.")

export const writtenSegmentIdShape = z
  .string()
  .min(1)
  .describe("The segment this call writes. Its id is the `segmentId` that `read` and `nodes` return.")

export const readArtifactInputShape = {
  ...reviewTargetShape,
  section: z
    .enum(ARTIFACT_SECTIONS)
    .describe("Which part to return. `overview` is the skeleton with what is unwritten; `diff` is the change per file; `full` is every word already written."),
  segmentId: segmentIdShape,
  paths: z.array(z.string().min(1)).min(1).optional().describe("For `diff`: only these files. Omit for every changed file."),
  limit: z.number().int().positive().optional().describe("For `diff`: files per page. Default 25."),
  after: z.string().min(1).optional().describe("For `diff`: the `next` of the previous page."),
}

export const readArtifactInputSchema = z.strictObject(readArtifactInputShape)

export type ReadArtifactInput = z.infer<typeof readArtifactInputSchema>

export type ArtifactReading
  = | { readonly kind: "read", readonly content: unknown }
    | { readonly kind: "rejected", readonly message: string }

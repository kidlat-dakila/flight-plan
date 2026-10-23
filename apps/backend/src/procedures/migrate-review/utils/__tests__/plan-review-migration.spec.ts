import { parse, stringify } from "devalue"
import { WEBHOOK_RETRY_ARTIFACT } from "@/procedures/get-review/utils/mocks/webhook-retry-artifact"
import { formatStoredReview, parseStoredReview, type ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import type { ArtifactMigration } from "@/procedures/migrate-review/utils/artifact-migration"
import { planReviewMigration } from "@/procedures/migrate-review/utils/plan-review-migration"

const SCAFFOLD: ReviewScaffold = {
  artifact: WEBHOOK_RETRY_ARTIFACT,
  baseCommit: "0000000",
  request: { configurationId: "standard", preset: "standard", order: "risk-first", customOrder: null, writer: { kind: "none" }, requestedAt: new Date("2026-10-01T12:00:00.000Z") },
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value)

const recordOf = (value: unknown): Readonly<Record<string, unknown>> => (isRecord(value) ? value : {})

const listOf = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : [])

const withNewerParts = (stored: unknown): unknown => {
  const root = recordOf(stored)
  const artifact = recordOf(root.artifact)
  const [segment, ...otherSegments] = listOf(artifact.segments)
  const traceDiagram = recordOf(recordOf(segment).traceDiagram)
  const [node, ...otherNodes] = listOf(traceDiagram.traceNodes)
  return {
    ...root,
    schema: 9,
    owner: "A field of a newer Flight Plan",
    artifact: {
      ...artifact,
      reviewers: ["octocat"],
      segments: [
        { ...recordOf(segment), traceDiagram: { ...traceDiagram, traceNodes: [{ ...recordOf(node), badge: "new" }, ...otherNodes] } },
        ...otherSegments,
      ],
    },
  }
}

const NEWER_TEXT = stringify(withNewerParts(parse(formatStoredReview(SCAFFOLD, "0.9.0"))))

describe("planReviewMigration", () => {
  it("brings a Flight Plan of a newer Flight Plan to the current shape, dropping what this version does not know at any depth", () => {
    const planned = planReviewMigration(NEWER_TEXT, { kind: "newer", savedVersion: "0.9.0", runningVersion: "0.1.11" }, [])

    expect(parseStoredReview(NEWER_TEXT)).toBeNull()
    expect(planned).toStrictEqual(parseStoredReview(formatStoredReview(SCAFFOLD, null)))
  })

  it("runs the migrations newer than the saved version, oldest first, on the stored file", () => {
    const older = stringify({ ...recordOf(parse(formatStoredReview(SCAFFOLD, "0.1.9"))), formerBaseCommit: "1111111" })
    const takeFormerBaseCommit: ArtifactMigration = {
      version: "0.1.12",
      migrate: (stored) => {
        const { formerBaseCommit, ...rest } = recordOf(stored)
        return { ...rest, meta: { ...recordOf(rest.meta), baseCommit: formerBaseCommit } }
      },
    }
    const alreadyRun: ArtifactMigration = { version: "0.1.9", migrate: () => null }

    expect(planReviewMigration(older, { kind: "outdated", savedVersion: "0.1.9" }, [takeFormerBaseCommit, alreadyRun])).toMatchObject({ baseCommit: "1111111" })
  })

  it("plans nothing it cannot read", () => {
    expect(planReviewMigration("{ broken", { kind: "newer", savedVersion: "0.9.0", runningVersion: "0.1.11" }, [])).toBeNull()
  })
})

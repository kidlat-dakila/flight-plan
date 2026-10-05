import { tallyWork, unwrittenWork } from "@/procedures/read-artifact/utils/unwritten-work"
import { DRAFT_ARTIFACT, DRAFT_SEGMENT, WALKTHROUGH_ONLY_ARTIFACT } from "./artifact-fixture"

const ALL_ON = { journey: true, blast: true, walkthrough: true }

const needsOf = (id: string | null, work: ReturnType<typeof unwrittenWork>): string[] =>
  work.filter((one) => one.id === id).map((one) => one.needs)

describe("unwrittenWork", () => {
  it("lists everything a fresh scaffold still needs, the Blast Diagram first", () => {
    const work = unwrittenWork(DRAFT_ARTIFACT, ALL_ON)

    expect(work.map((one) => `${one.target}:${one.id ?? ""}:${one.needs}`)).toStrictEqual([
      "blast-node:b-subtotal:contract",
      "blast-node:b-cart-total:verdict",
      "blast-node:b-cart-page:verdict",
      "context::context",
      "context::overview",
      "context::implementation",
      "file:src/catalog/price.ts:file-title",
      "file:src/cart/subtotal.ts:file-title",
      "waypoint:w1:title",
      "waypoint:w1:reading",
      "waypoint:w2:title",
      "waypoint:w2:reading",
      "waypoint:w3:title",
      "waypoint:w3:reading",
      "journey-node:j-subtotal:label",
    ])
  })

  it("asks no verdict of a dependent that an unaffected node shields", () => {
    const assessed = {
      ...DRAFT_SEGMENT.blast,
      nodes: (DRAFT_SEGMENT.blast?.nodes ?? []).map((node) =>
        node.id === "b-cart-total" ? { ...node, verdict: "unaffected" as const, effect: "It formats the number it is given." } : node),
      edges: DRAFT_SEGMENT.blast?.edges ?? [],
    }
    const artifact = { ...DRAFT_ARTIFACT, segments: [{ ...DRAFT_SEGMENT, blast: assessed }] }

    const work = unwrittenWork(artifact, ALL_ON)

    expect(needsOf("b-cart-total", work)).toStrictEqual([])
    expect(needsOf("b-cart-page", work)).toStrictEqual([])
  })

  it("leaves out the work of a section the configuration turned off", () => {
    const work = unwrittenWork(DRAFT_ARTIFACT, { journey: false, blast: false, walkthrough: true })

    expect(work.filter((one) => one.target === "blast-node" || one.target === "journey-node")).toStrictEqual([])
    expect(needsOf("w1", work)).toStrictEqual(["title", "reading"])
  })

  it("asks a solution of a bug, a risk and a nit, and none of a question", () => {
    const finding = { title: "Wrong", reading: "It is wrong.", trace: null, solution: null }
    const withFindings = {
      ...WALKTHROUGH_ONLY_ARTIFACT,
      segments: WALKTHROUGH_ONLY_ARTIFACT.segments.map((segment) => ({
        ...segment,
        walkthrough: {
          ...segment.walkthrough,
          files: segment.walkthrough.files.map((file) => ({
            ...file,
            waypoints: file.waypoints.map((waypoint) =>
              waypoint.id === "w1"
                ? { ...waypoint, findings: [{ ...finding, id: "f-nit", kind: "nit" as const }, { ...finding, id: "f-question", kind: "question" as const }] }
                : waypoint),
          })),
        },
      })),
    }

    const work = unwrittenWork(withFindings, ALL_ON)

    expect(work.filter((one) => one.needs === "solution").map((one) => one.message)).toStrictEqual([
      "The nit `f-nit` on `w1` has no solution. Every bug, risk and nit carries the lines as they should be.",
    ])
  })

  it("counts the work by kind, leaving out the kinds with none", () => {
    expect(tallyWork(unwrittenWork(WALKTHROUGH_ONLY_ARTIFACT, ALL_ON))).toStrictEqual({
      total: 11,
      byKind: { "context": 1, "overview": 1, "implementation": 1, "file-title": 2, "title": 3, "reading": 3 },
    })
  })
})

import { tallyNodes, tallyWork, unwrittenWork } from "@/procedures/read-artifact/utils/unwritten-work"
import { DRAFT_ARTIFACT, DRAFT_JOURNEY_NODE, DRAFT_SEGMENT, draftJourneyOf, WALKTHROUGH_ONLY_ARTIFACT } from "./artifact-fixture"

const ALL_ON = { journey: true, blast: true, walkthrough: true }

const needsOf = (id: string | null, work: ReturnType<typeof unwrittenWork>): string[] =>
  work.filter((one) => one.id === id).map((one) => one.needs)

describe("unwrittenWork", () => {
  it("lists everything a fresh scaffold still needs, the Blast Diagram first", () => {
    const work = unwrittenWork(DRAFT_ARTIFACT, ALL_ON)

    expect(work.map((one) => `${one.target}:${one.id ?? ""}:${one.needs}`)).toStrictEqual([
      "blast-node:src/cart/CartPage.tsx:impact",
      "blast-node:src/cart/CartTotal.tsx:impact",
      "context::context",
      "file:src/catalog/price.ts:file-title",
      "file:src/cart/subtotal.ts:file-title",
      "waypoint:w1:title",
      "waypoint:w1:reading",
      "waypoint:w2:title",
      "waypoint:w2:reading",
      "waypoint:w3:title",
      "waypoint:w3:reading",
      "journey-node:j-subtotal:label",
      "journey::journey-description",
    ])
  })

  it("asks no impact of a file that reaches the change only through an unaffected file", () => {
    const assessed = {
      nodes: (DRAFT_SEGMENT.blast?.nodes ?? []).map((node) =>
        node.path === "src/cart/CartTotal.tsx" ? { ...node, impactType: "unaffected" as const } : node),
      edges: DRAFT_SEGMENT.blast?.edges ?? [],
    }
    const artifact = { ...DRAFT_ARTIFACT, segments: [{ ...DRAFT_SEGMENT, blast: assessed }] }

    const work = unwrittenWork(artifact, ALL_ON)

    expect(needsOf("src/cart/CartTotal.tsx", work)).toStrictEqual([])
    expect(needsOf("src/cart/CartPage.tsx", work)).toStrictEqual([])
  })

  it("asks a label of every node at any depth that has none, and of every trigger of a node that has none", () => {
    const journey = draftJourneyOf([
      {
        ...DRAFT_JOURNEY_NODE,
        label: "Rounds the cart total",
        triggers: [
          { codeBlockId: "click", type: "render-event", name: "onClick", label: null },
          { codeBlockId: "load", type: "data-fetch", name: "fetch", label: "Loads the cart" },
        ],
        children: [{ ...DRAFT_JOURNEY_NODE, id: "j-line-total", declaration: "lineTotal" }],
      },
    ])

    const work = unwrittenWork({ ...DRAFT_ARTIFACT, segments: [{ ...DRAFT_SEGMENT, journey }] }, ALL_ON)

    expect(needsOf("j-subtotal", work)).toStrictEqual(["trigger-label"])
    expect(needsOf("j-line-total", work)).toStrictEqual(["label"])
  })

  it("asks a label of every listed block of a node that has none", () => {
    const journey = draftJourneyOf([
      {
        ...DRAFT_JOURNEY_NODE,
        label: "Rounds the cart total",
        listedBlocks: [
          { codeBlockId: "held", type: "state", name: "held", label: null },
          { codeBlockId: "round", type: "function", name: "round", label: "Rounds to the nearest cent" },
        ],
      },
    ])

    const work = unwrittenWork({ ...DRAFT_ARTIFACT, segments: [{ ...DRAFT_SEGMENT, journey }] }, ALL_ON)

    expect(needsOf("j-subtotal", work)).toStrictEqual(["block-label"])
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

  it("asks a description of a Journey Flow Diagram that has a node and none of one that is described or empty", () => {
    const withJourney = (journey: ReturnType<typeof draftJourneyOf>) => ({ ...DRAFT_ARTIFACT, segments: [{ ...DRAFT_SEGMENT, journey }] })
    const drawn = draftJourneyOf([DRAFT_JOURNEY_NODE])

    expect(needsOf(null, unwrittenWork(withJourney(drawn), ALL_ON))).toStrictEqual(["context", "journey-description"])
    expect(needsOf(null, unwrittenWork(withJourney({ ...drawn, description: "A cart is shown, and its total is summed." }), ALL_ON))).toStrictEqual(["context"])
    expect(needsOf(null, unwrittenWork(withJourney(draftJourneyOf([])), ALL_ON))).toStrictEqual(["context"])
  })

  it("asks for a title on a segment that has none, after its context", () => {
    const untitled = { ...WALKTHROUGH_ONLY_ARTIFACT, segments: WALKTHROUGH_ONLY_ARTIFACT.segments.map((segment) => ({ ...segment, title: "" })) }

    expect(unwrittenWork(untitled, ALL_ON).slice(0, 2).map((one) => `${one.target}:${one.needs}`)).toStrictEqual([
      "context:context",
      "context:segment-title",
    ])
  })

  it("counts the nodes that still need writing apart from the ones that do not", () => {
    expect(tallyNodes(WALKTHROUGH_ONLY_ARTIFACT, ALL_ON)).toStrictEqual({ complete: 0, incomplete: 6 })
    expect(tallyNodes(DRAFT_ARTIFACT, { journey: false, blast: false, walkthrough: false })).toStrictEqual({ complete: 0, incomplete: 1 })
  })

  it("counts the work by kind, leaving out the kinds with none", () => {
    expect(tallyWork(unwrittenWork(WALKTHROUGH_ONLY_ARTIFACT, ALL_ON))).toStrictEqual({
      total: 9,
      byKind: { "context": 1, "file-title": 2, "title": 3, "reading": 3 },
    })
  })
})

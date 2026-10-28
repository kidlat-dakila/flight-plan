import { tallyNodes, tallyWork, unwrittenWork } from "@/procedures/read-artifact/utils/unwritten-work"
import { DRAFT_ARTIFACT, DRAFT_TRACE_NODE, DRAFT_SEGMENT, draftTraceOf, WALKTHROUGH_ONLY_ARTIFACT } from "./artifact-fixture"
import { TEAM_FILES } from "./team-fixture"
import { traceCode } from "./traced-fixture"

const PAGE_ID = "src/pages/TeamPage.tsx#component@7:1"
const team = traceCode(TEAM_FILES)
const TEAM_ARTIFACT = { ...DRAFT_ARTIFACT, sources: team.sources, segments: [{ ...DRAFT_SEGMENT, traceDiagram: team.traceDiagram }] }

const blockLabelMessagesOf = (nodeId: string): string[] =>
  unwrittenWork(TEAM_ARTIFACT).filter((one) => one.needs === "block-label" && one.id === nodeId).map((one) => one.message)

const needsOf = (id: string | null, work: ReturnType<typeof unwrittenWork>): string[] =>
  work.filter((one) => one.id === id).map((one) => one.needs)

describe("unwrittenWork", () => {
  it("lists everything a fresh scaffold still needs, the Blast Diagram first", () => {
    const work = unwrittenWork(DRAFT_ARTIFACT)

    expect(work.map((one) => `${one.target}:${one.id ?? ""}:${one.needs}`)).toStrictEqual([
      "blast-node:src/cart/CartPage.tsx:impact",
      "blast-node:src/cart/CartTotal.tsx:impact",
      "context::context",
      "waypoint:w1:title",
      "waypoint:w1:reading",
      "waypoint:w2:title",
      "waypoint:w2:reading",
      "waypoint:w3:title",
      "waypoint:w3:reading",
      "trace-node:j-subtotal:label",
      "trace-diagram::trace-title",
      "trace-diagram::trace-description",
    ])
  })

  it("asks no impact of a file that reaches the change only through an unaffected file", () => {
    const assessed = {
      nodes: (DRAFT_SEGMENT.blastDiagram?.nodes ?? []).map((node) =>
        node.path === "src/cart/CartTotal.tsx" ? { ...node, impactType: "unaffected" as const } : node),
      edges: DRAFT_SEGMENT.blastDiagram?.edges ?? [],
    }
    const artifact = { ...DRAFT_ARTIFACT, segments: [{ ...DRAFT_SEGMENT, blastDiagram: assessed }] }

    const work = unwrittenWork(artifact)

    expect(needsOf("src/cart/CartTotal.tsx", work)).toStrictEqual([])
    expect(needsOf("src/cart/CartPage.tsx", work)).toStrictEqual([])
  })

  it("asks a label of every node at any depth that has none, and of every trigger of a node that has none", () => {
    const traceDiagram = draftTraceOf([
      {
        ...DRAFT_TRACE_NODE,
        label: "Rounds the cart total",
        triggers: [
          { codeBlockId: "click", type: "render-event", name: "onClick", label: null },
          { codeBlockId: "load", type: "data-fetch", name: "fetch", label: "Loads the cart" },
        ],
        children: [{ ...DRAFT_TRACE_NODE, id: "j-line-total", declaration: "lineTotal" }],
      },
    ])

    const work = unwrittenWork({ ...DRAFT_ARTIFACT, segments: [{ ...DRAFT_SEGMENT, traceDiagram }] })

    expect(needsOf("j-subtotal", work)).toStrictEqual(["trigger-label"])
    expect(needsOf("j-line-total", work)).toStrictEqual(["label"])
  })

  it("asks a label of every listed block of a node that has none", () => {
    const traceDiagram = draftTraceOf([
      {
        ...DRAFT_TRACE_NODE,
        label: "Rounds the cart total",
        listedBlocks: [
          { codeBlockId: "held", type: "state", name: "held", label: null },
          { codeBlockId: "round", type: "function", name: "round", label: "Rounds to the nearest cent" },
        ],
      },
    ])

    const work = unwrittenWork({ ...DRAFT_ARTIFACT, segments: [{ ...DRAFT_SEGMENT, traceDiagram }] })

    expect(needsOf("j-subtotal", work)).toStrictEqual(["block-label"])
  })

  it("names each unwritten row of a function card by its place and the code written there", () => {
    expect(blockLabelMessagesOf("src/trainers/rename.ts#function@2:1")).toStrictEqual([
      "The call `loadTrainers()` (block `src/trainers/rename.ts#external-value@3:3`, at line 3, column 20) of `src/trainers/rename.ts#function@2:1` has no label. Say what the call is for, and the condition it runs under when it has one.",
      "The throw `throw new RangeError` (block `src/trainers/rename.ts#throw@4:30`) of `src/trainers/rename.ts#function@2:1` has no label. Say what it raises and when.",
      "The return (block `src/trainers/rename.ts#function@2:1`, at line 5, column 3) of `src/trainers/rename.ts#function@2:1` has no label. Say what it returns, and when, if it is not the only or the last return.",
    ])
  })

  it("asks each unwritten row of a component card in the words of its kind", () => {
    expect(blockLabelMessagesOf("src/pages/badges.tsx#component@1:1")).toStrictEqual([
      "The return `return <p>` (block `src/pages/badges.tsx#component@1:1`, at line 2, column 3) of `src/pages/badges.tsx#component@1:1` has no label. Say what it renders, and when, if it is not the last return.",
      "The render row `badges.map()` (block `src/pages/badges.tsx#render-loop@4:8`) of `src/pages/badges.tsx#component@1:1` has no label. Say what it renders for each item, as \"Renders … for each …\".",
    ])
    expect(blockLabelMessagesOf(PAGE_ID).slice(1, 3)).toStrictEqual([
      `The memo \`teamTypes = useMemo()\` (block \`src/pages/TeamPage.tsx#derived@9:3\`) of \`${PAGE_ID}\` has no label. Say what it works out, starting with a verb.`,
      `The effect \`useEffect()\` (block \`src/pages/TeamPage.tsx#component-effect@10:3\`) of \`${PAGE_ID}\` has no label. Say what it does, starting with a verb.`,
    ])
    expect(blockLabelMessagesOf(PAGE_ID).slice(5)).toStrictEqual([
      `The render row \`{renderBadges()}\` (block \`src/pages/TeamPage.tsx#render@15:5\`, at line 17, column 8) of \`${PAGE_ID}\` has no label. Say what it renders and which code drew it, as "Renders … that renderBadges drew".`,
      `The render row \`{… && <p>}\` (block \`src/pages/TeamPage.tsx#render-condition@18:8\`) of \`${PAGE_ID}\` has no label. Say what it renders and when, as "Renders … when …".`,
      `The render row \`trainer.team.map()\` (block \`src/pages/TeamPage.tsx#render@21:11\`) of \`${PAGE_ID}\` has no label. Say which component it renders, and when or for each what, as "Renders \`<TeamSlot />\` for each …".`,
    ])
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

    const work = unwrittenWork(withFindings)

    expect(work.filter((one) => one.needs === "solution").map((one) => one.message)).toStrictEqual([
      "The nit `f-nit` on `w1` has no solution. Every bug, risk and nit carries the lines as they should be.",
    ])
  })

  it("asks a title and a description of a Trace Diagram that has a node, and none of one that has them or is empty", () => {
    const withTrace = (traceDiagram: ReturnType<typeof draftTraceOf>) => ({ ...DRAFT_ARTIFACT, segments: [{ ...DRAFT_SEGMENT, traceDiagram }] })
    const drawn = draftTraceOf([DRAFT_TRACE_NODE])

    expect(needsOf(null, unwrittenWork(withTrace(drawn)))).toStrictEqual(["context", "trace-title", "trace-description"])
    expect(needsOf(null, unwrittenWork(withTrace({ ...drawn, description: "A cart is shown, and its total is summed." })))).toStrictEqual(["context", "trace-title"])
    expect(needsOf(null, unwrittenWork(withTrace({ ...drawn, title: "View cart flow diagram", description: "A cart is shown, and its total is summed." })))).toStrictEqual(["context"])
    expect(needsOf(null, unwrittenWork(withTrace(draftTraceOf([]))))).toStrictEqual(["context"])
  })

  it("asks for a title on a segment that has none, after its context, when the review is split into segments", () => {
    const untitled = { ...WALKTHROUGH_ONLY_ARTIFACT, isSegmented: true, segments: WALKTHROUGH_ONLY_ARTIFACT.segments.map((segment) => ({ ...segment, title: "" })) }

    expect(unwrittenWork(untitled).slice(0, 2).map((one) => `${one.target}:${one.needs}`)).toStrictEqual([
      "context:context",
      "context:segment-title",
    ])
  })

  it("asks for no segment title when segments are off, since none is shown", () => {
    const untitled = { ...WALKTHROUGH_ONLY_ARTIFACT, isSegmented: false, segments: WALKTHROUGH_ONLY_ARTIFACT.segments.map((segment) => ({ ...segment, title: "" })) }

    expect(unwrittenWork(untitled).map((one) => one.needs)).not.toContain("segment-title")
  })

  it("counts the nodes that still need writing apart from the ones that do not", () => {
    expect(tallyNodes(WALKTHROUGH_ONLY_ARTIFACT)).toStrictEqual({ complete: 0, incomplete: 4 })
  })

  it("counts the work by kind, leaving out the kinds with none", () => {
    expect(tallyWork(unwrittenWork(WALKTHROUGH_ONLY_ARTIFACT))).toStrictEqual({
      total: 7,
      byKind: { context: 1, title: 3, reading: 3 },
    })
  })
})

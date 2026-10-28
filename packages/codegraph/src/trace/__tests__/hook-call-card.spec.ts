import { createSegment, createViewContext, highlightPlainly } from "@/__tests__/review-fixture"
import { parseMarkedSource } from "@/code/marked-source"
import { codeOf, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import type { SourceRange } from "@/code-blocks/types"
import { buildTrace } from "@/trace/build"
import { listTraceNodes } from "@/trace-diagram"
import { presentDiagramOf } from "@/trace-diagram/__tests__/diagram-fixture"
import type { TraceDiagram, TraceDiagramView, TraceNodeView } from "@flightplan/configurations"

const TEAM_PAGE = codeOf(
  "import { useCallback, useEffect, useMemo, useState } from \"react\"",
  "import { findStrongest, saveTeam, subscribeToTeam } from \"./team\"",
  "const LAST_TRAINER_KEY = \"team-builder.last-trainer\"",
  "export function TeamPage({ trainerId, trainer }) {",
  "  const [isPublishing, setIsPublishing] = useState(false)",
  "  const strongest = useMemo(() => findStrongest(trainer), [trainer])",
  "  const save = useCallback(() => { saveTeam(trainerId) }, [trainerId])",
  "  useEffect(() => {",
  "    localStorage.setItem(LAST_TRAINER_KEY, String(trainerId))",
  "  }, [trainerId])",
  "  useEffect(() => {",
  "    setIsPublishing(isPublishing && strongest !== null)",
  "    const unsubscribe = subscribeToTeam(trainerId)",
  "    return unsubscribe",
  "  }, [trainerId])",
  "  return <button onClick={save}>{strongest}</button>",
  "}",
)
const REACT_FILES: FixtureFiles = {
  "src/team-page.tsx": TEAM_PAGE,
  "src/team.ts": codeOf("export const findStrongest = (team) => team", "export const saveTeam = (id) => id", "export const subscribeToTeam = (id) => () => id"),
  "src/main.ts": codeOf("import { TeamPage } from \"./team-page\"", "export const main = () => TeamPage"),
}
const PAGE_ID = "src/team-page.tsx#component@4:1"
const MEMO_ID = "src/team-page.tsx#derived@6:3"
const CALLBACK_MEMO_ID = "src/team-page.tsx#external-value@7:3"
const STORAGE_EFFECT_ID = "src/team-page.tsx#component-effect@8:3"
const SUBSCRIBE_EFFECT_ID = "src/team-page.tsx#component-effect@11:3"

const VUE_PAGE = codeOf(
  "<script setup lang=\"ts\">",
  "import { computed, watch, watchEffect } from \"vue\"",
  "import { findStrongest } from \"./team\"",
  "const props = defineProps<{ trainerId: number, maxSlots: number }>()",
  "const strongest = computed(() => findStrongest(props.trainerId))",
  "watch(() => props.trainerId, (id) => { findStrongest(id) })",
  "const LAST_TRAINER_KEY = \"team-builder.last-trainer\"",
  "watchEffect(() => { findStrongest(props.maxSlots, LAST_TRAINER_KEY) })",
  "</script>",
  "<template><p>{{ strongest }}</p></template>",
)
const VUE_FILES: FixtureFiles = {
  "src/TeamPage.vue": VUE_PAGE,
  "src/team.ts": codeOf("export const findStrongest = (team) => team"),
  "src/main.ts": codeOf("import TeamPage from \"./TeamPage.vue\"", "export const main = () => TeamPage"),
}
const VUE_PAGE_ID = "src/TeamPage.vue#component@1:1"

const ADDED_MARK = "+"
const LINE_BREAK = "\n"
const VUE_SUFFIX = ".vue"

const addedOf = (files: FixtureFiles): Readonly<Record<string, readonly SourceRange[]>> =>
  Object.fromEntries(Object.entries(files).map(([path, text]) => [path, [{ start: { line: 1, column: 1 }, end: { line: text.split(LINE_BREAK).length, column: 2 } }]]))

const sourcesOf = (files: FixtureFiles): ReturnType<typeof highlightPlainly>[] =>
  Object.entries(files).map(([path, text]) =>
    highlightPlainly(parseMarkedSource(path, path.endsWith(VUE_SUFFIX) ? "vue" : "typescript", text.split(LINE_BREAK).map((line) => `${ADDED_MARK}${line}`).join(LINE_BREAK))))

const diagramOfAdded = (files: FixtureFiles): TraceDiagram => presentDiagramOf(files, addedOf(files))

const viewOf = (files: FixtureFiles): TraceDiagramView | null =>
  buildTrace(createSegment({ traceDiagram: diagramOfAdded(files) }), "", [], { ...createViewContext(), sources: sourcesOf(files) }).diagram

const listNodeViews = (nodes: readonly TraceNodeView[]): TraceNodeView[] => nodes.flatMap((node) => [node, ...listNodeViews(node.children)])

const nodeViewOf = (view: TraceDiagramView | null, nodeId: string): TraceNodeView | undefined => listNodeViews(view?.nodes ?? []).find((node) => node.id === nodeId)

const rowsOf = (node: TraceNodeView | undefined): TraceNodeView["blockLists"][number]["blocks"] => (node?.blockLists ?? []).flatMap(({ blocks }) => blocks)

const groupsOf = (node: TraceNodeView | undefined): [string | null, string[]][] => {
  const rowById = new Map(rowsOf(node).map((row) => [row.id, row] as const))
  const shown = (rowId: string): string => {
    const row = rowById.get(rowId)
    if (row === undefined) return rowId
    return row.label === row.name ? row.name : `${row.name} · ${row.label}`
  }
  return (node?.rowGroups ?? []).map(({ label, rowIds, calleeCards }) => [label, [...rowIds.map(shown), ...(calleeCards ?? []).map(({ name, rowIds: callIds }) => `${name}: ${callIds.map(shown).join(", ")}`)]])
}

const headOf = (node: TraceNodeView | undefined): [string, string] | undefined => (node === undefined ? undefined : [node.name, node.typeLabel])

describe("the card of an effect", () => {
  it("merges an effect with its callback: no card of the callback, a card named after the hook that lists what the callback reads", () => {
    const diagram = diagramOfAdded(REACT_FILES)
    const effect = nodeViewOf(viewOf(REACT_FILES), STORAGE_EFFECT_ID)

    expect(listTraceNodes(diagram.traceNodes).map((node) => node.type)).not.toContain("effect-callback")
    expect(headOf(effect)).toStrictEqual(["useEffect", "Effect"])
    expect(groupsOf(effect)).toStrictEqual([
      ["Dependencies", ["trainerId"]],
      ["Outside variables", ["LAST_TRAINER_KEY · Constant"]],
      ["External calls", []],
    ])
  })

  it("names what each outside variable is, lists a call out in the card of what it calls, and returns its cleanup", () => {
    const effect = nodeViewOf(viewOf(REACT_FILES), SUBSCRIBE_EFFECT_ID)

    expect(groupsOf(effect)).toStrictEqual([
      ["Dependencies", ["trainerId"]],
      ["Outside variables", ["setIsPublishing · State setter", "isPublishing · State", "strongest · State"]],
      ["External calls", ["subscribeToTeam: subscribeToTeam()"]],
      ["Returns and raises", ["return"]],
    ])
  })

  it("asks a label for the calls and the returns of the callback, keyed by where each is, and none for a dependency or an outside variable", () => {
    const node = listTraceNodes(diagramOfAdded(REACT_FILES).traceNodes).find((one) => one.id === SUBSCRIBE_EFFECT_ID)
    const effect = nodeViewOf(viewOf(REACT_FILES), SUBSCRIBE_EFFECT_ID)

    expect(node?.blockLabels.map(({ codeBlock, at }) => [codeBlock.id, at])).toStrictEqual([
      ["src/team-page.tsx#external-value@13:5", { line: 13, column: 25 }],
      ["src/team-page.tsx#function@11:13", { line: 14, column: 5 }],
    ])
    expect(rowsOf(effect).filter((row) => row.isDraft).map(({ id }) => id)).toStrictEqual([
      "src/team-page.tsx#external-value@13:5@13:25",
      "src/team-page.tsx#function@11:13@14:5",
    ])
  })

  it("lists the watched source of a Vue watch as its dependency, and what watchEffect reads as an outside variable, a const of the script a Constant", () => {
    const view = viewOf(VUE_FILES)

    expect(groupsOf(nodeViewOf(view, "src/TeamPage.vue#component-effect@6:1"))).toStrictEqual([
      ["Dependencies", ["props.trainerId"]],
      ["External calls", ["findStrongest: findStrongest()"]],
    ])
    expect(groupsOf(nodeViewOf(view, "src/TeamPage.vue#component-effect@8:1"))).toStrictEqual([
      ["Outside variables", ["maxSlots · Prop", "LAST_TRAINER_KEY · Constant"]],
      ["External calls", ["findStrongest: findStrongest()"]],
    ])
  })
})

describe("the card of a memo", () => {
  it("makes useMemo and useCallback nodes named after what they declare, typed Memo, with the dependencies and the calls of the callback", () => {
    const view = viewOf(REACT_FILES)

    expect([headOf(nodeViewOf(view, MEMO_ID)), headOf(nodeViewOf(view, CALLBACK_MEMO_ID))]).toStrictEqual([["strongest", "Memo"], ["save", "Memo"]])
    expect(groupsOf(nodeViewOf(view, MEMO_ID))).toStrictEqual([
      ["Dependencies", ["trainer"]],
      ["External calls", ["findStrongest: findStrongest()"]],
    ])
    expect(groupsOf(nodeViewOf(view, CALLBACK_MEMO_ID))).toStrictEqual([
      ["Dependencies", ["trainerId"]],
      ["External calls", ["saveTeam: saveTeam()"]],
    ])
  })

  it("makes a Vue computed a memo", () => {
    const memo = nodeViewOf(viewOf(VUE_FILES), "src/TeamPage.vue#derived@5:1")

    expect(headOf(memo)).toStrictEqual(["strongest", "Memo"])
    expect(groupsOf(memo)).toStrictEqual([
      ["Outside variables", ["trainerId · Prop"]],
      ["External calls", ["findStrongest: findStrongest()"]],
    ])
  })
})

const READER_FILES: FixtureFiles = {
  "src/use-trainer.ts": codeOf("export const useTrainer = (id) => ({ id })"),
  "src/team.ts": codeOf("export const typesOf = (trainer) => [trainer]", "export const saveTrainer = (trainer) => trainer"),
  "src/team-page.tsx": codeOf(
    "import { useEffect, useMemo } from \"react\"",
    "import { useTrainer } from \"./use-trainer\"",
    "import { saveTrainer, typesOf } from \"./team\"",
    "export const TeamPage = ({ trainerId }) => {",
    "  const trainer = useTrainer(trainerId)",
    "  const teamTypes = useMemo(() => typesOf(trainer), [trainer])",
    "  useEffect(() => { saveTrainer(trainer) }, [trainer])",
    "  return <p>{teamTypes}</p>",
    "}",
  ),
  "src/main.ts": codeOf("import { TeamPage } from \"./team-page\"", "export const main = () => TeamPage"),
}

describe("the lines of a memo and an effect", () => {
  it("leave only the call rows, so a value the memo or the effect only reads draws no line to where it came from", () => {
    const edges = (viewOf(READER_FILES)?.edges ?? []).map(({ from, to, fromRowId }) => [from, to, fromRowId])
    const memoId = "src/team-page.tsx#derived@6:3"
    const effectId = "src/team-page.tsx#component-effect@7:3"

    expect(edges.filter(([from]) => from === memoId)).toStrictEqual([[memoId, "src/team.ts#function@1:1", "src/team-page.tsx#function@6:29@6:35"]])
    expect(edges.filter(([from]) => from === effectId)).toStrictEqual([[effectId, "src/team.ts#function@2:1", "src/team-page.tsx#call@7:21@7:21"]])
    expect(edges.filter(([, to]) => to === memoId || to === effectId).map(([from]) => from)).toStrictEqual(["src/team-page.tsx#component@4:1", "src/team-page.tsx#component@4:1"])
  })
})

describe("the memos and the effects of a component card", () => {
  it("lists each memo and each effect as a row with a label to write and the call as written, and leaves its card from that row", () => {
    const view = viewOf(REACT_FILES)
    const page = nodeViewOf(view, PAGE_ID)
    const rowsOfKind = (kind: string): [string, boolean][] => (page?.blockLists.find((list) => list.kind === kind)?.blocks ?? []).map(({ name, isDraft }) => [name, isDraft])

    expect(page?.rowGroups.map(({ label }) => label)).toStrictEqual(["Props", "State", "External calls", "Memos", "Effects", "Triggers", "Renders"])
    expect(rowsOfKind("memo")).toStrictEqual([["strongest = useMemo()", true], ["save = useCallback()", true]])
    expect(rowsOfKind("effect")).toStrictEqual([["useEffect()", true], ["useEffect()", true]])
    expect((view?.edges ?? []).filter((edge) => edge.from === PAGE_ID).map(({ to, fromRowId }) => [to, fromRowId])).toStrictEqual(expect.arrayContaining([
      [MEMO_ID, MEMO_ID],
      [CALLBACK_MEMO_ID, CALLBACK_MEMO_ID],
      [STORAGE_EFFECT_ID, STORAGE_EFFECT_ID],
      [SUBSCRIBE_EFFECT_ID, SUBSCRIBE_EFFECT_ID],
    ]))
  })

  it("lists a Vue computed under Memos and a watch and a watchEffect under Effects", () => {
    const page = nodeViewOf(viewOf(VUE_FILES), VUE_PAGE_ID)

    expect(page?.blockLists.filter(({ kind }) => kind === "memo" || kind === "effect").map(({ label, blocks }) => [label, blocks.map(({ name }) => name)])).toStrictEqual([
      ["Memos", ["strongest = computed()"]],
      ["Effects", ["watch()", "watchEffect()"]],
    ])
  })
})

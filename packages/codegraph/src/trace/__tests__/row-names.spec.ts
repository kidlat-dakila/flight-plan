import { createSegment, createViewContext, highlightPlainly } from "@/__tests__/review-fixture"
import { parseMarkedSource } from "@/code/marked-source"
import { codeOf, rangeAt, type FixtureDiffs, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import type { SourceRange } from "@/code-blocks/types"
import { buildTrace } from "@/trace/build"
import { cardRowNameOf, listCardRowNames } from "@/trace/row-names"
import { listTraceNodes } from "@/trace-diagram"
import { presentDiagramOf } from "@/trace-diagram/__tests__/diagram-fixture"
import { siteIdOf } from "@/trace-diagram/function-card"
import type { TraceNodeView } from "@flightplan/configurations"

const FILES: FixtureFiles = {
  "src/team.ts": codeOf("export const findStrongest = (team) => team", "export const subscribe = (id) => () => id"),
  "src/badges.tsx": codeOf("export const renderBadges = (badges) => <ul>{badges}</ul>"),
  "src/team-slot.tsx": codeOf("export const TeamSlot = ({ pokemon }) => <li>{pokemon}</li>"),
  "src/team-page.tsx": codeOf(
    "import { useEffect, useMemo } from \"react\"",
    "import { findStrongest, subscribe } from \"./team\"",
    "import { renderBadges } from \"./badges\"",
    "import { TeamSlot } from \"./team-slot\"",
    "export function TeamPage({ trainer }) {",
    "  const strongest = useMemo(() => findStrongest(trainer), [trainer])",
    "  useEffect(() => {",
    "    const stop = subscribe(trainer.id)",
    "    return stop",
    "  }, [trainer])",
    "  if (trainer === null) return null",
    "  return (",
    "    <section>",
    "      {strongest ? <TeamSlot pokemon={strongest} /> : <p>None</p>}",
    "      {renderBadges(trainer.badges)}",
    "    </section>",
    "  )",
    "}",
  ),
  "src/main.ts": codeOf("import { TeamPage } from \"./team-page\"", "export const main = () => TeamPage"),
}

const LINE_BREAK = "\n"
const ADDED_MARK = "+"

const addedOf = (files: FixtureFiles): FixtureDiffs =>
  Object.fromEntries(Object.entries(files).map(([path, text]): [string, readonly SourceRange[]] => [path, [rangeAt(1, 1, text.split(LINE_BREAK).length, 2)]]))

const listNodeViews = (nodes: readonly TraceNodeView[]): TraceNodeView[] => nodes.flatMap((node) => [node, ...listNodeViews(node.children)])

describe("the names of the rows an agent writes a label for", () => {
  it("are the names the card draws, with the kind of each row, for every block label of a component, a memo and an effect", () => {
    const diagram = presentDiagramOf(FILES, addedOf(FILES))
    const highlighted = Object.entries(FILES).map(([path, text]) => highlightPlainly(parseMarkedSource(path, "typescript", text.split(LINE_BREAK).map((line) => `${ADDED_MARK}${line}`).join(LINE_BREAK))))
    const sources = highlighted.map(({ source }) => source)
    const views = listNodeViews(buildTrace(createSegment({ traceDiagram: diagram }), "", [], { ...createViewContext(), sources: highlighted }).diagram?.nodes ?? [])
    const shownName = (nodeId: string, rowId: string): string | undefined =>
      views.find((view) => view.id === nodeId)?.blockLists.flatMap(({ blocks }) => blocks).find((row) => row.id === rowId)?.name
    const named = listTraceNodes(diagram.traceNodes).filter((node) => node.blockLabels.length > 0).map((node) => {
      const rowNames = listCardRowNames(node, sources)
      return [node.id, node.blockLabels.map((label) => {
        const row = cardRowNameOf(label, rowNames)
        return [row?.kind, row?.name, row?.name === shownName(node.id, siteIdOf(label.codeBlock, label.at))]
      })]
    })

    expect(named).toStrictEqual(expect.arrayContaining([
      ["src/team-page.tsx#component@5:1", [
        ["memo", "strongest = useMemo()", true],
        ["effect", "useEffect()", true],
        ["return", "return null", true],
        ["return", "return <section>", true],
        ["component", "{… ? <TeamSlot> : …}", true],
        ["value", "{renderBadges()}", true],
      ]],
      ["src/team-page.tsx#component-effect@7:3", [["call", "subscribe()", true], ["return", "return", true]]],
      ["src/team-page.tsx#derived@6:3", [["call", "findStrongest()", true]]],
    ]))
  })
})

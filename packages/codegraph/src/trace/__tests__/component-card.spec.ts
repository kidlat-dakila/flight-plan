import { createSegment, createViewContext, highlightPlainly } from "@/__tests__/review-fixture"
import { parseMarkedSource } from "@/code/marked-source"
import { codeOf, sourcesOf as codeSourcesOf, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import { buildStoredCodeGroupGraph } from "@/code-blocks/build-group"
import { linkCodeGroupGraph } from "@/code-blocks/link-group"
import type { SourceRange } from "@/code-blocks/types"
import { buildTrace } from "@/trace/build"
import { generateTraceDiagram, listTraceNodes } from "@/trace-diagram"
import { importGraphGroupOf, presentDiagramOf } from "@/trace-diagram/__tests__/diagram-fixture"
import type { TraceDiagram, TraceDiagramView, TraceNode, TraceNodeView } from "@flightplan/configurations"

const TEAM_PAGE = codeOf(
  "import { useEffect, useState } from \"react\"",
  "import { publishTeam } from \"../../api/teams\"",
  "import { useTrainer } from \"../../hooks/use-trainer\"",
  "import { formatTeamTitle } from \"../../lib/team-title\"",
  "import { TeamSlot } from \"./components/TeamSlot\"",
  "",
  "const LAST_TRAINER_KEY = \"team-builder.last-trainer\"",
  "",
  "interface TeamPageProps {",
  "  trainerId: number",
  "  maxSlots: number",
  "}",
  "",
  "export function TeamPage({ trainerId, maxSlots }: TeamPageProps) {",
  "  const [isPublishing, setIsPublishing] = useState(false)",
  "  const trainer = useTrainer(trainerId)",
  "",
  "  useEffect(() => {",
  "    localStorage.setItem(LAST_TRAINER_KEY, String(trainerId))",
  "  }, [trainerId])",
  "",
  "  if (trainer === null) return <p>Loading the trainer…</p>",
  "",
  "  const title = formatTeamTitle(trainer.name, trainer.team.length, maxSlots)",
  "",
  "  const publish = async () => {",
  "    setIsPublishing(true)",
  "    await publishTeam(trainerId)",
  "    setIsPublishing(false)",
  "  }",
  "",
  "  return (",
  "    <section>",
  "      <h1>{title}</h1>",
  "      <ul>",
  "        {trainer.team.map((pokemon) => (",
  "          <TeamSlot key={pokemon.id} pokemon={pokemon} />",
  "        ))}",
  "      </ul>",
  "      <button type=\"button\" disabled={isPublishing} onClick={publish}>",
  "        Publish the team",
  "      </button>",
  "    </section>",
  "  )",
  "}",
)
const TEAM_FILES: FixtureFiles = {
  "src/api/teams.ts": codeOf("export async function publishTeam(trainerId: number): Promise<void> {", "  await fetch(\"/api/trainers\", { body: String(trainerId) })", "}"),
  "src/hooks/use-trainer.ts": codeOf("export function useTrainer(trainerId: number) {", "  return trainerId", "}"),
  "src/lib/team-title.ts": codeOf("export function formatTeamTitle(trainerName: string, teamSize: number, maxSlots: number): string {", "  return trainerName", "}"),
  "src/pages/team/TeamPage.tsx": TEAM_PAGE,
  "src/pages/team/components/TeamSlot.tsx": codeOf("export function TeamSlot({ pokemon }: { pokemon: Pokemon }) {", "  return <li>{pokemon.name}</li>", "}"),
  "src/main.tsx": codeOf("import { TeamPage } from \"./pages/team/TeamPage\"", "export const main = () => <TeamPage trainerId={1} maxSlots={6} />"),
}
const TEAM_PAGE_ID = "src/pages/team/TeamPage.tsx#component@14:1"
const TEAM_SLOT_ID = "src/pages/team/components/TeamSlot.tsx#component@1:1"
const EFFECT_ID = "src/pages/team/TeamPage.tsx#component-effect@18:3"

const RENDERS = codeOf(
  "import { useCallback, useEffect, useMemo, useState } from \"react\"",
  "import { Button } from \"@mui/material\"",
  "import { useTrainer } from \"./use-trainer\"",
  "import { findStrongest, saveTeam } from \"./team\"",
  "import { TeamSlot } from \"./team-slot\"",
  "export function TeamPage({ trainerId, maxSlots }: { trainerId: number, maxSlots: number }) {",
  "  const [isPublishing, setIsPublishing] = useState(false)",
  "  const trainer = useTrainer(trainerId)",
  "  const strongest = useMemo(() => findStrongest(trainer), [trainer])",
  "  const save = useCallback(() => { saveTeam(trainerId) }, [trainerId])",
  "  useEffect(() => {",
  "    setIsPublishing(false)",
  "  }, [trainerId])",
  "  if (trainer === null) return null",
  "  const badges = <b>{maxSlots}</b>",
  "  const renderItems = () => <i>items</i>",
  "  return (",
  "    <section>",
  "      {trainer.team.length === 0 && <p>None</p>}",
  "      {isPublishing ? <TeamSlot pokemon={strongest} /> : null}",
  "      <ul>{trainer.team.map((pokemon) => <TeamSlot key={pokemon.id} pokemon={pokemon} />)}</ul>",
  "      {badges}",
  "      {renderItems()}",
  "      {maxSlots}",
  "      <Button onClick={save}>Save</Button>",
  "    </section>",
  "  )",
  "}",
)
const RENDER_FILES: FixtureFiles = {
  "src/team-page.tsx": RENDERS,
  "src/team-slot.tsx": codeOf("export const TeamSlot = ({ pokemon }) => <li>{pokemon}</li>"),
  "src/use-trainer.ts": codeOf("export const useTrainer = (id) => id"),
  "src/team.ts": codeOf("export const findStrongest = (team) => team", "export const saveTeam = (id) => id"),
  "src/main.ts": codeOf("import { TeamPage } from \"./team-page\"", "export const main = () => TeamPage"),
}
const RENDERS_ID = "src/team-page.tsx#component@6:1"

const VUE_PAGE = codeOf(
  "<script setup lang=\"ts\">",
  "import { computed, ref, watch, watchEffect } from \"vue\"",
  "import TeamSlot from \"./TeamSlot.vue\"",
  "import { findStrongest } from \"./team\"",
  "const props = defineProps<{ trainerId: number, maxSlots: number }>()",
  "const isPublishing = ref(false)",
  "const strongest = computed(() => findStrongest(props.trainerId))",
  "watch(() => props.trainerId, (id) => { findStrongest(id) })",
  "watchEffect(() => { findStrongest(props.maxSlots) })",
  "</script>",
  "<template>",
  "  <section>",
  "    <p v-if=\"isPublishing\">Busy</p>",
  "    <TeamSlot v-for=\"pokemon in props.trainerId\" :key=\"pokemon\" :pokemon=\"pokemon\" />",
  "  </section>",
  "</template>",
)
const VUE_FILES: FixtureFiles = {
  "src/TeamPage.vue": VUE_PAGE,
  "src/TeamSlot.vue": codeOf("<template><li>slot</li></template>"),
  "src/team.ts": codeOf("export const findStrongest = (team) => team"),
  "src/main.ts": codeOf("import TeamPage from \"./TeamPage.vue\"", "export const main = () => TeamPage"),
}
const VUE_PAGE_ID = "src/TeamPage.vue#component@1:1"

const ADDED_MARK = "+"
const LINE_BREAK = "\n"
const VUE_SUFFIX = ".vue"

const wholeFile = (text: string): SourceRange => ({ start: { line: 1, column: 1 }, end: { line: text.split(LINE_BREAK).length, column: 2 } })

const addedOf = (files: FixtureFiles): Readonly<Record<string, readonly SourceRange[]>> =>
  Object.fromEntries(Object.entries(files).map(([path, text]) => [path, [wholeFile(text)]]))

const languageOf = (path: string): string => (path.endsWith(VUE_SUFFIX) ? "vue" : "typescript")

const sourcesOf = (files: FixtureFiles): ReturnType<typeof highlightPlainly>[] =>
  Object.entries(files).map(([path, text]) => highlightPlainly(parseMarkedSource(path, languageOf(path), text.split(LINE_BREAK).map((line) => `${ADDED_MARK}${line}`).join(LINE_BREAK))))

const diagramOfAdded = (files: FixtureFiles): TraceDiagram => presentDiagramOf(files, addedOf(files))

const viewOf = (files: FixtureFiles, traceDiagram: TraceDiagram = diagramOfAdded(files)): TraceDiagramView | null =>
  buildTrace(createSegment({ traceDiagram }), "", [], { ...createViewContext(), sources: sourcesOf(files) }).diagram

const diagramWithUnopened = (files: FixtureFiles, importerPath: string, specifier: string, unopenedPath: string): TraceDiagram => {
  const sources = codeSourcesOf(files, addedOf(files)).map((source) =>
    source.filePath === importerPath ? { ...source, importedFilePaths: new Map([...source.importedFilePaths, [specifier, unopenedPath]]) } : source)
  const diagram = generateTraceDiagram({ group: linkCodeGroupGraph(buildStoredCodeGroupGraph(sources)), importGraphGroup: importGraphGroupOf(files), scope: null })
  if (diagram === null) throw new Error("The fixture has no diagram.")
  return diagram
}

const listNodeViews = (nodes: readonly TraceNodeView[]): TraceNodeView[] => nodes.flatMap((node) => [node, ...listNodeViews(node.children)])

const nodeViewOf = (view: TraceDiagramView | null, nodeId: string): TraceNodeView | undefined => listNodeViews(view?.nodes ?? []).find((node) => node.id === nodeId)

type Row = TraceNodeView["blockLists"][number]["blocks"][number]

const rowsById = (node: TraceNodeView | undefined): ReadonlyMap<string, Row> =>
  new Map([...(node?.blockLists ?? []).flatMap(({ blocks }) => blocks), ...(node?.triggerLabels ?? [])].map((row) => [row.id, row] as const))

const nameOfRow = (node: TraceNodeView | undefined, rowId: string): string => rowsById(node).get(rowId)?.name ?? rowId

const groupsOf = (node: TraceNodeView | undefined): [string | null, string[]][] =>
  (node?.rowGroups ?? []).map(({ label, rowIds, calleeCards }) => [label, [...rowIds, ...(calleeCards ?? []).map(({ name }) => name)].map((rowId) => nameOfRow(node, rowId))])

const renderGroupsOf = (node: TraceNodeView | undefined): [string, string, [string, string, string[]][]][] =>
  (node?.rowGroups ?? []).flatMap(({ renderGroups }) => renderGroups ?? []).map(({ name, rowId, rows }) => [
    name,
    nameOfRow(node, rowId),
    rows.map((row) => [row.kind, nameOfRow(node, row.rowId), row.childIds]),
  ])

const nodeOf = (diagram: TraceDiagram, nodeId: string): TraceNode | undefined => listTraceNodes(diagram.traceNodes).find((node) => node.id === nodeId)

const labelKeysOf = (diagram: TraceDiagram, nodeId: string): string[] =>
  (nodeOf(diagram, nodeId)?.blockLabels ?? []).map(({ codeBlock, at }) => (at === undefined ? codeBlock.id : `${codeBlock.id}@${String(at.line)}:${String(at.column)}`))

describe("the rows of a component card", () => {
  it("groups a component as Props, State, External calls, Effects, Triggers and Renders, with no parameter chips and no Hooks, Calls or Steps", () => {
    const page = nodeViewOf(viewOf(TEAM_FILES), TEAM_PAGE_ID)

    expect(page?.parameters).toStrictEqual([])
    expect(groupsOf(page)).toStrictEqual([
      ["Props", ["trainerId: number", "maxSlots: number"]],
      ["State", ["isPublishing = false"]],
      ["External calls", ["useTrainer", "formatTeamTitle"]],
      ["Effects", ["useEffect()"]],
      ["Triggers", ["button.onClick"]],
      ["Renders", []],
    ])
  })

  it("draws a prop and a state as the code writes them, with nothing to write", () => {
    const rows = (nodeViewOf(viewOf(TEAM_FILES), TEAM_PAGE_ID)?.blockLists ?? []).filter(({ kind }) => kind === "argument" || kind === "state").flatMap(({ blocks }) => blocks)

    expect(rows.map(({ name, label, isDraft }) => [name, label, isDraft])).toStrictEqual([
      ["trainerId: number", "trainerId: number", false],
      ["maxSlots: number", "maxSlots: number", false],
      ["isPublishing = false", "isPublishing = false", false],
    ])
  })

  it("takes the type of a prop from the type written inline, from the type of the same file, or from defineProps, and keeps the name alone without one", () => {
    const propsOf = (files: FixtureFiles, nodeId: string): string[] =>
      (nodeViewOf(viewOf(files), nodeId)?.blockLists.find(({ kind }) => kind === "argument")?.blocks ?? []).map(({ name }) => name)

    expect(propsOf(TEAM_FILES, TEAM_SLOT_ID)).toStrictEqual(["pokemon: Pokemon"])
    expect(propsOf(RENDER_FILES, RENDERS_ID)).toStrictEqual(["trainerId: number", "maxSlots: number"])
    expect(propsOf(RENDER_FILES, "src/team-slot.tsx#component@1:1")).toStrictEqual(["pokemon"])
    expect(propsOf(VUE_FILES, VUE_PAGE_ID)).toStrictEqual(["trainerId: number", "maxSlots: number"])
  })

  it("draws a Vue state with the call that makes it", () => {
    const states = nodeViewOf(viewOf(VUE_FILES), VUE_PAGE_ID)?.blockLists.find(({ kind }) => kind === "state")?.blocks ?? []

    expect(states.map(({ name }) => name)).toStrictEqual(["isPublishing = ref(false)"])
  })

  it("groups each call out under the card of what it calls, a hook of the repository included, and the line to it leaves that call", () => {
    const view = viewOf(TEAM_FILES)
    const page = nodeViewOf(view, TEAM_PAGE_ID)
    const cards = (page?.rowGroups ?? []).flatMap(({ calleeCards }) => calleeCards ?? [])

    expect(cards.map(({ name, typeLabel, rowIds }) => [name, typeLabel, rowIds.map((rowId) => nameOfRow(page, rowId))])).toStrictEqual([
      ["useTrainer", "Hook", ["useTrainer()"]],
      ["formatTeamTitle", "Function", ["formatTeamTitle()"]],
    ])
    expect((view?.edges ?? []).filter((edge) => edge.from === TEAM_PAGE_ID).map(({ to, fromRowId }) => [to, fromRowId])).toStrictEqual([
      ["src/hooks/use-trainer.ts#hook@1:1", "src/pages/team/TeamPage.tsx#external-value@16:3@16:19"],
      ["src/lib/team-title.ts#function@1:1", "src/pages/team/TeamPage.tsx#external-value@24:3@24:17"],
      [TEAM_SLOT_ID, "src/pages/team/TeamPage.tsx#render@37:11"],
      [EFFECT_ID, EFFECT_ID],
      ["src/pages/team/TeamPage.tsx#render-event@40:53", "src/pages/team/TeamPage.tsx#render-event@40:53"],
    ])
  })
})

describe("the renders of a component card", () => {
  it("gives each return its group with its label row, in the order written, and holds the child component in the row that renders it", () => {
    const page = nodeViewOf(viewOf(TEAM_FILES), TEAM_PAGE_ID)

    expect(renderGroupsOf(page)).toStrictEqual([
      ["return <p>", "return <p>", []],
      ["return <section>", "return <section>", [["component", "trainer.team.map()", [TEAM_SLOT_ID]]]],
    ])
    expect(page?.children.map((child) => child.id)).toStrictEqual([TEAM_SLOT_ID])
    expect(page?.rowGroups.flatMap(({ childIds }) => childIds)).toStrictEqual([])
  })

  it("keys the label of a return by the block around it and where it is, and gives the row the lines of what it renders", () => {
    const page = nodeViewOf(viewOf(TEAM_FILES), TEAM_PAGE_ID)
    const renders = page?.blockLists.find(({ kind }) => kind === "render")?.blocks ?? []

    expect(renders.map(({ id, lines, isDraft }) => [id, lines, isDraft])).toStrictEqual([
      ["src/pages/team/TeamPage.tsx#condition@22:3@22:25", [[22, 22]], true],
      ["src/pages/team/TeamPage.tsx#component@14:1@32:3", [[32, 44]], true],
      ["src/pages/team/TeamPage.tsx#render@37:11", [[36, 38]], true],
    ])
  })

  it("lists markup that renders only sometimes, a loop, a child component of the repository and markup held in a value, and no row for a library component, an element or a plain value", () => {
    const page = nodeViewOf(viewOf(RENDER_FILES), RENDERS_ID)

    expect(renderGroupsOf(page)).toStrictEqual([
      ["return null", "return null", []],
      ["return <section>", "return <section>", [
        ["condition", "{… && <p>}", []],
        ["component", "{… ? <TeamSlot> : …}", ["src/team-slot.tsx#component@1:1"]],
        ["component", "trainer.team.map()", []],
        ["value", "{badges}", []],
        ["value", "{renderItems()}", []],
      ]],
    ])
  })

  it("gives an arrow function component one group for its body, and a Vue component one group for its template, with v-if and v-for", () => {
    expect(renderGroupsOf(nodeViewOf(viewOf(RENDER_FILES), "src/team-slot.tsx#component@1:1"))).toStrictEqual([["=> <li>", "=> <li>", []]])
    expect(renderGroupsOf(nodeViewOf(viewOf(VUE_FILES), VUE_PAGE_ID))).toStrictEqual([
      ["<template>", "<template>", [["condition", "<p v-if>", []], ["component", "<TeamSlot v-for>", ["src/TeamSlot.vue#component@1:1"]]]],
    ])
  })

  it("asks a label for each call, memo, effect, return and render row, keyed by where a site is, and shows the label written for it", () => {
    const diagram = diagramOfAdded(RENDER_FILES)
    const written: TraceDiagram = {
      ...diagram,
      traceNodes: diagram.traceNodes.map((node) => (node.id === RENDERS_ID
        ? { ...node, blockLabels: node.blockLabels.map((listed) => (listed.at?.line === 22 ? { ...listed, label: "Renders the badges" } : listed)) }
        : node)),
    }
    const shown = [...rowsById(nodeViewOf(viewOf(RENDER_FILES, written), RENDERS_ID)).values()].filter((row) => !row.isDraft && row.label === "Renders the badges")

    expect(labelKeysOf(diagram, RENDERS_ID)).toStrictEqual([
      "src/team-page.tsx#external-value@8:3@8:19",
      "src/team-page.tsx#derived@9:3",
      "src/team-page.tsx#external-value@10:3",
      "src/team-page.tsx#component-effect@11:3",
      "src/team-page.tsx#condition@14:3@14:25",
      "src/team-page.tsx#component@6:1@17:3",
      "src/team-page.tsx#render-condition@19:8",
      "src/team-page.tsx#render@20:23",
      "src/team-page.tsx#render@21:42",
      "src/team-page.tsx#render@18:5@22:8",
      "src/team-page.tsx#render@18:5@23:8",
    ])
    expect(shown.map(({ id }) => id)).toStrictEqual(["src/team-page.tsx#render@18:5@22:8"])
  })

  it("holds a component of the repository whose markup a value renders in that value row, as a component row does", () => {
    const files: FixtureFiles = {
      "src/badges.tsx": codeOf("export const renderBadges = (badges) => <ul>{badges}</ul>"),
      "src/trainer-card.tsx": codeOf(
        "import { renderBadges } from \"./badges\"",
        "export const TrainerCard = ({ trainer }) => {",
        "  return <section>{renderBadges(trainer.badges)}</section>",
        "}",
      ),
      "src/main.ts": codeOf("import { TrainerCard } from \"./trainer-card\"", "export const main = () => TrainerCard"),
    }
    const card = nodeViewOf(viewOf(files), "src/trainer-card.tsx#component@2:1")

    expect(renderGroupsOf(card)).toStrictEqual([["return <section>", "return <section>", [["value", "{renderBadges()}", ["src/badges.tsx#component@1:1"]]]]])
    expect(card?.children.map((child) => child.id)).toStrictEqual(["src/badges.tsx#component@1:1"])
    expect(card?.rowGroups.flatMap(({ childIds }) => childIds)).toStrictEqual([])
  })

  it("gives each component of the repository it renders a component row, one per branch of a ternary, though the group did not open the file of that component", () => {
    const files: FixtureFiles = {
      "src/App.tsx": codeOf(
        "import { useState } from \"react\"",
        "import { TrainersPage } from \"./trainers\"",
        "import { ItemsPage } from \"./items\"",
        "export const App = () => {",
        "  const [page] = useState(\"trainers\")",
        "  return <main>{page === \"trainers\" ? <TrainersPage /> : <ItemsPage />}</main>",
        "}",
      ),
      "src/trainers.tsx": codeOf("export const TrainersPage = () => <p>Trainers</p>"),
      "src/main.ts": codeOf("import { App } from \"./App\"", "export const main = () => App"),
    }
    const page = nodeViewOf(viewOf(files, diagramWithUnopened(files, "src/App.tsx", "./items", "src/items.tsx")), "src/App.tsx#component@4:1")

    expect(renderGroupsOf(page)).toStrictEqual([["return <main>", "return <main>", [
      ["component", "{… ? <TrainersPage> : …}", ["src/trainers.tsx#component@1:1"]],
      ["component", "{… ? … : <ItemsPage>}", []],
    ]]])
  })

  it("gives each component of a Vue v-if, v-else-if and v-else chain its own component row", () => {
    const files: FixtureFiles = {
      "src/App.vue": codeOf(
        "<script setup lang=\"ts\">",
        "import { ref } from \"vue\"",
        "import HelpPage from \"./HelpPage.vue\"",
        "import ItemsPage from \"./ItemsPage.vue\"",
        "const page = ref(\"help\")",
        "</script>",
        "<template>",
        "  <main>",
        "    <HelpPage v-if=\"page === 'help'\" />",
        "    <ItemsPage v-else-if=\"page === 'items'\" />",
        "    <p v-else>Nothing</p>",
        "  </main>",
        "</template>",
      ),
      "src/HelpPage.vue": codeOf("<template><p>Help</p></template>"),
      "src/main.ts": codeOf("import App from \"./App.vue\"", "export const main = () => App"),
    }
    const page = nodeViewOf(viewOf(files, diagramWithUnopened(files, "src/App.vue", "./ItemsPage.vue", "src/ItemsPage.vue")), "src/App.vue#component@1:1")

    expect(renderGroupsOf(page)).toStrictEqual([["<template>", "<template>", [
      ["component", "<HelpPage v-if>", ["src/HelpPage.vue#component@1:1"]],
      ["component", "<ItemsPage v-else-if>", []],
      ["condition", "<p v-else>", []],
    ]]])
  })
})

describe("the props of a Vue component card", () => {
  it("lists no row for an event defineEmits declares, and keeps the mark of an optional prop", () => {
    const files: FixtureFiles = {
      "src/BaseButton.vue": codeOf(
        "<script setup lang=\"ts\">",
        "defineProps<{ variant?: \"primary\" | \"ghost\", disabled?: boolean }>()",
        "const emit = defineEmits<{ (event: \"click\"): void }>()",
        "</script>",
        "<template>",
        "  <button :disabled=\"disabled\" @click=\"emit('click')\"><slot /></button>",
        "</template>",
      ),
      "src/main.ts": codeOf("import BaseButton from \"./BaseButton.vue\"", "export const main = () => BaseButton"),
    }
    const props = nodeViewOf(viewOf(files), "src/BaseButton.vue#component@1:1")?.blockLists.find(({ kind }) => kind === "argument")?.blocks ?? []

    expect(props.map(({ name }) => name)).toStrictEqual(["variant?: \"primary\" | \"ghost\"", "disabled?: boolean"])
  })
})

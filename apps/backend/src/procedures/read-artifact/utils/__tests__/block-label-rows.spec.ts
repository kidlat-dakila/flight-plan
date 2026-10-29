import { mockTrace } from "@/procedures/get-review/utils/mocks/mock-trace"
import { blockLabelKeyOf, describeBlockLabels } from "@/procedures/read-artifact/utils/block-label-rows"
import { parseMarkedSource } from "@flightplan/codegraph"
import type { SourceFile } from "@flightplan/configurations"
import { TEAM_FILES, VUE_TEAM_FILES } from "./team-fixture"
import { traceCode } from "./traced-fixture"

const STATE_PATH = "src/trainers/state.py"
const STATE_SOURCES: readonly SourceFile[] = [parseMarkedSource(STATE_PATH, "python", ["#region state", " trainers = []", "#endregion state"].join("\n"))]
const [stateNode] = mockTrace(STATE_SOURCES, [
  {
    id: "state",
    type: "class",
    path: STATE_PATH,
    declaration: "state",
    isChanged: true,
    label: null,
    description: null,
    listedBlocks: [{ codeBlockId: "trainers", type: "state", name: "trainers", label: null }],
  },
], []).traceNodes

const react = traceCode(TEAM_FILES)
const vue = traceCode(VUE_TEAM_FILES)

const namesOf = ({ nodeOf, sources }: ReturnType<typeof traceCode>, id: string) =>
  describeBlockLabels(nodeOf(id), sources).map(({ kind, name, at }) => ({ kind, name, at }))

describe("describeBlockLabels", () => {
  it("names the calls, returns and throws of a function card as the card draws them", () => {
    expect(namesOf(react, "src/trainers/rename.ts#function@2:1")).toStrictEqual([
      { kind: "call", name: "loadTrainers()", at: { line: 3, column: 20 } },
      { kind: "throw", name: "throw new RangeError", at: undefined },
      { kind: "return", name: "return", at: { line: 5, column: 3 } },
    ])
  })

  it("names the calls, memos, effects, returns and render rows of a component card as the card draws them", () => {
    expect(namesOf(react, "src/pages/TeamPage.tsx#component@7:1")).toStrictEqual([
      { kind: "call", name: "useTrainer()", at: { line: 8, column: 19 } },
      { kind: "memo", name: "teamTypes = useMemo()", at: undefined },
      { kind: "effect", name: "useEffect()", at: undefined },
      { kind: "return", name: "return <p>", at: { line: 13, column: 25 } },
      { kind: "return", name: "return <section>", at: { line: 14, column: 3 } },
      { kind: "value", name: "{renderBadges()}", at: { line: 17, column: 8 } },
      { kind: "condition", name: "{… && <p>}", at: undefined },
      { kind: "component", name: "trainer.team.map()", at: undefined },
    ])
    expect(namesOf(react, "src/pages/badges.tsx#component@1:1")).toStrictEqual([
      { kind: "return", name: "return <p>", at: { line: 2, column: 3 } },
      { kind: "loop", name: "badges.map()", at: undefined },
    ])
  })

  it("names the rows of a memo card and of an effect card like those of a function card", () => {
    expect(namesOf(react, "src/pages/TeamPage.tsx#derived@9:3")).toStrictEqual([{ kind: "call", name: "listTeamTypes()", at: { line: 9, column: 35 } }])
    expect(namesOf(react, "src/pages/TeamPage.tsx#component-effect@10:3")).toStrictEqual([{ kind: "call", name: "rename()", at: { line: 11, column: 5 } }])
  })

  it("names the template of a Vue component as its return, and its render rows as the card draws them", () => {
    expect(namesOf(vue, "src/TeamPage.vue#component@1:1")).toStrictEqual([
      { kind: "memo", name: "strongest = computed()", at: undefined },
      { kind: "effect", name: "watchEffect()", at: undefined },
      { kind: "return", name: "<template>", at: undefined },
      { kind: "condition", name: "<p v-if>", at: undefined },
      { kind: "component", name: "<TeamSlot v-for>", at: undefined },
    ])
  })

  it("keeps the label, and names a row of any other card by the name of its code", () => {
    expect(describeBlockLabels(stateNode, STATE_SOURCES)).toStrictEqual([{ codeBlockId: "trainers", kind: "block", name: "trainers", label: null }])
  })
})

describe("blockLabelKeyOf", () => {
  it("keys a row by its code block id and its place, and a row with no place by its id alone", () => {
    expect([blockLabelKeyOf("rename", { line: 5, column: 5 }), blockLabelKeyOf("empty", undefined)]).toStrictEqual(["rename@5:5", "empty"])
  })
})

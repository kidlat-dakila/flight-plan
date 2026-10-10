import { countPatternMatches } from "@/catalogue/matching/count-matches"
import { checkProposedLibraries } from "@/catalogue/proposed-patterns"
import type { CatalogueLibrary } from "@/catalogue/types"

const eventBus: CatalogueLibrary = {
  name: "Event bus",
  specifiers: ["@acme/event-bus"],
  documentedVersion: "1",
  category: "queues",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createBus",
      methods: [
        { kind: "call", name: "emit", slots: [], makes: "publish", eventAt: 0 },
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
    },
  ],
}

const FILES = [
  { filePath: "src/bus.ts", text: "import { createBus } from \"@acme/event-bus\"\nexport const bus = createBus()\nbus.emit(\"started\")" },
  { filePath: "src/orders.ts", text: "import { createBus } from \"@acme/event-bus\"\nconst bus = createBus()\nbus.emit(\"order-paid\")\nbus.emit(\"order-sent\")" },
  { filePath: "README.md", text: "bus.on(\"order-paid\", sendReceipt)" },
]

describe("countPatternMatches", () => {
  it("counts how often each pattern matches in the files of a repository a language reads", () => {
    expect(countPatternMatches(FILES, [eventBus])).toStrictEqual([
      { library: "Event bus", patternKey: "factory:createBus:*", matchCount: 2 },
      { library: "Event bus", patternKey: "factory:createBus:*>call:emit:*", matchCount: 3 },
    ])
  })

  it("gives what the check of proposed libraries needs to keep a pattern or refuse it", () => {
    const check = checkProposedLibraries([eventBus], countPatternMatches(FILES, [eventBus]))

    expect(check.kept.map((kept) => [kept.patternKey, kept.matchCount])).toStrictEqual([
      ["factory:createBus:*", 2],
      ["factory:createBus:*>call:emit:*", 3],
    ])
    expect(check.refused).toStrictEqual(["Event bus: factory:createBus:*>call:on:* matches nothing in the repository"])
  })
})

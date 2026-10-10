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

describe("checkProposedLibraries", () => {
  it("keeps a proposed pattern with how often it matched", () => {
    const check = checkProposedLibraries(
      [eventBus],
      [
        { library: "Event bus", patternKey: "factory:createBus:*", matchCount: 1 },
        { library: "Event bus", patternKey: "factory:createBus:*>call:emit:*", matchCount: 37 },
        { library: "Event bus", patternKey: "factory:createBus:*>call:on:*", matchCount: 12 },
      ],
    )

    expect(check).toStrictEqual({
      kept: [
        { library: "Event bus", patternKey: "factory:createBus:*", matchCount: 1 },
        { library: "Event bus", patternKey: "factory:createBus:*>call:emit:*", matchCount: 37 },
        { library: "Event bus", patternKey: "factory:createBus:*>call:on:*", matchCount: 12 },
      ],
      refused: [],
    })
  })

  it("refuses a proposed pattern that matched nothing", () => {
    const check = checkProposedLibraries(
      [eventBus],
      [
        { library: "Event bus", patternKey: "factory:createBus:*", matchCount: 1 },
        { library: "Event bus", patternKey: "factory:createBus:*>call:emit:*", matchCount: 0 },
      ],
    )

    expect(check.refused).toStrictEqual([
      "Event bus: factory:createBus:*>call:emit:* matches nothing in the repository",
      "Event bus: factory:createBus:*>call:on:* matches nothing in the repository",
    ])
  })

  it("does not count the matches of a pattern of another library", () => {
    const check = checkProposedLibraries([eventBus], [{ library: "Express", patternKey: "factory:createBus:*", matchCount: 4 }])

    expect(check.kept).toStrictEqual([])
  })
})

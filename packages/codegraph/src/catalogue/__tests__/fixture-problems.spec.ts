import { listFixtureProblems } from "@/catalogue/fixture-problems"
import type { CatalogueLibrary, PatternFixture } from "@/catalogue/types"

const react: CatalogueLibrary = {
  name: "React",
  specifiers: ["react"],
  documentedVersion: "19",
  category: "framework",
  type: "frontend",
  language: "javascript",
  patterns: [{ kind: "call", name: "useEffect", slots: [{ at: 0, runs: "effect" }] }],
}

const useEffectFixture: PatternFixture = {
  library: "React",
  patternKey: "call:useEffect:*",
  matches: ["import { useEffect } from \"react\"\nuseEffect(() => {}, [])"],
  rejects: ["const useEffect = () => null\nuseEffect()"],
}

describe("listFixtureProblems", () => {
  it("finds no problem when every pattern has a fixture with both kinds of code", () => {
    expect(listFixtureProblems([react], [useEffectFixture])).toStrictEqual([])
  })

  it("reports a pattern with no fixture", () => {
    expect(listFixtureProblems([react], [])).toStrictEqual(["React: call:useEffect:* has no fixture"])
  })

  it("does not count the fixture of another library", () => {
    const preact: CatalogueLibrary = { ...react, name: "Preact", specifiers: ["preact"] }
    const preactFixture: PatternFixture = { ...useEffectFixture, library: "Preact" }

    expect(listFixtureProblems([react, preact], [preactFixture])).toStrictEqual(["React: call:useEffect:* has no fixture"])
  })

  it("reports a fixture of a library that is not in the catalogue", () => {
    expect(listFixtureProblems([react], [useEffectFixture, { ...useEffectFixture, library: "Preact" }])).toStrictEqual([
      "Preact: the fixture of call:useEffect:* is of a library that is not in the catalogue",
    ])
  })

  it("reports a fixture whose pattern does not exist", () => {
    const stray: PatternFixture = { ...useEffectFixture, patternKey: "call:useMount:*" }

    expect(listFixtureProblems([react], [useEffectFixture, stray])).toStrictEqual([
      "React: the fixture of call:useMount:* has no pattern",
    ])
  })

  it("reports a fixture with no code it must match", () => {
    expect(listFixtureProblems([react], [{ ...useEffectFixture, matches: [] }])).toStrictEqual([
      "React: the fixture of call:useEffect:* has no code it must match",
    ])
  })

  it("reports a fixture with no code it must not match", () => {
    expect(listFixtureProblems([react], [{ ...useEffectFixture, rejects: [] }])).toStrictEqual([
      "React: the fixture of call:useEffect:* has no code it must not match",
    ])
  })
})

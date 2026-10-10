import { listPatternKeys, patternKeyOf } from "@/catalogue/pattern-keys"
import type { CatalogueLibrary } from "@/catalogue/types"

const libraryWith = (patterns: CatalogueLibrary["patterns"]): CatalogueLibrary => ({
  name: "Express",
  specifiers: ["express"],
  documentedVersion: "5",
  category: "framework",
  type: "backend",
  language: "javascript",
  patterns,
})

describe("patternKeyOf", () => {
  it("names a pattern by its kind, its name and every version when it has no range", () => {
    expect(patternKeyOf({ kind: "call", name: "useQuery", slots: [] })).toBe("call:useQuery:*")
  })

  it("keeps the range of a pattern that holds for some versions only", () => {
    expect(patternKeyOf({ kind: "call", name: "useQuery", versions: ">=5", slots: [] })).toBe("call:useQuery:>=5")
  })

  it("names a file pattern by its glob", () => {
    expect(patternKeyOf({ kind: "file", glob: "app/**/page.tsx", exports: [] })).toBe("file:app/**/page.tsx:*")
  })
})

describe("patternKeyOf, for the other kinds", () => {
  it("names a directive by its text", () => {
    expect(patternKeyOf({ kind: "directive", text: "use server", runs: "route" })).toBe("directive:use server:*")
  })

  it("adds the specifier of a pattern that is imported from one specifier only", () => {
    expect(patternKeyOf({ kind: "element", name: "default", from: "next/link", slots: [], makes: "navigation" })).toBe(
      "element:default@next/link:*",
    )
  })
})

describe("listPatternKeys", () => {
  it("lists the methods of a factory that is a method of a factory under both", () => {
    const library = libraryWith([
      {
        kind: "factory",
        name: "Router",
        methods: [
          { kind: "factory", name: "route", prefixAt: 0, methods: [{ kind: "call", name: "get", slots: [{ at: "last", runs: "route" }], method: "GET" }] },
        ],
      },
    ])

    expect(listPatternKeys(library)).toStrictEqual([
      "factory:Router:*",
      "factory:Router:*>factory:route:*",
      "factory:Router:*>factory:route:*>call:get:*",
    ])
  })

  it("lists a factory and each of its methods under it", () => {
    const library = libraryWith([
      {
        kind: "factory",
        name: "Router",
        methods: [
          { kind: "call", name: "get", slots: [{ at: "last", runs: "route" }], pathAt: 0 },
          { kind: "call", name: "post", slots: [{ at: "last", runs: "route" }], pathAt: 0 },
        ],
      },
    ])

    expect(listPatternKeys(library)).toStrictEqual([
      "factory:Router:*",
      "factory:Router:*>call:get:*",
      "factory:Router:*>call:post:*",
    ])
  })

  it("lists a decorator of a factory under it", () => {
    const library = libraryWith([
      {
        kind: "factory",
        name: "FastAPI",
        methods: [{ kind: "decorator", name: "get", runs: "route", pathAt: 0, method: "GET" }],
      },
    ])

    expect(listPatternKeys(library)).toStrictEqual(["factory:FastAPI:*", "factory:FastAPI:*>decorator:get:*"])
  })

  it("lists what a factory makes when it is called, and its methods, under the factory", () => {
    const library = libraryWith([
      {
        kind: "factory",
        name: "create",
        methods: [],
        called: { slots: [{ at: 0, runs: "in-place" }], methods: [{ kind: "call", name: "getState", slots: [], makes: "state" }] },
      },
    ])

    expect(listPatternKeys(library)).toStrictEqual(["factory:create:*", "factory:create:*>called", "factory:create:*>called>call:getState:*"])
  })

  it("lists the methods of a class under it", () => {
    const library = libraryWith([
      { kind: "class", name: "Model", members: [], methods: [{ kind: "call", name: "findAll", slots: [], makes: "data" }] },
    ])

    expect(listPatternKeys(library)).toStrictEqual(["class:Model:*", "class:Model:*>call:findAll:*"])
  })

  it("gives no key for a library with no pattern", () => {
    expect(listPatternKeys(libraryWith([]))).toStrictEqual([])
  })
})

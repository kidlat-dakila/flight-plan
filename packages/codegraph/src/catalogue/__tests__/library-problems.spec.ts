import { listCatalogueProblems, listLibraryProblems } from "@/catalogue/library-problems"
import type { CatalogueLibrary, CataloguePattern } from "@/catalogue/types"

const libraryWith = (patterns: readonly CataloguePattern[], name = "Express", specifiers: readonly string[] = ["express"]): CatalogueLibrary => ({
  name,
  specifiers,
  documentedVersion: "5",
  category: "framework",
  type: "backend",
  language: "javascript",
  patterns,
})

const route: CataloguePattern = { kind: "call", name: "post", slots: [{ at: "last", runs: "route" }], pathAt: 0, method: "POST" }

describe("listLibraryProblems", () => {
  it("finds no problem in a library whose patterns each say something", () => {
    expect(listLibraryProblems(libraryWith([route]))).toStrictEqual([])
  })

  it("reports a library with no pattern and no location", () => {
    expect(listLibraryProblems(libraryWith([]))).toStrictEqual(["has no pattern and no location"])
  })

  it("accepts a library with no pattern that says where a tool keeps its files", () => {
    const runner: CatalogueLibrary = {
      ...libraryWith([], "Vitest", ["vitest"]),
      locations: [{ classification: "test", files: [{ glob: "vitest.config.*" }], keys: [{ key: "test.include", holds: "globs" }] }],
    }

    expect(listLibraryProblems(runner)).toStrictEqual([])
  })

  it("reports a location that reads no key and marks nothing, and one that gives way to a key it does not read", () => {
    const runner: CatalogueLibrary = {
      ...libraryWith([route]),
      locations: [
        { classification: "test", files: [{ glob: "jest.config.*" }], keys: [] },
        { classification: "test", files: [{ glob: "jest.config.*" }], keys: [{ key: "testMatch", holds: "globs", unlessRead: "testRegex" }] },
        { classification: "build-and-infrastructure", files: [], keys: [], marks: "folder" },
      ],
    }

    expect(listLibraryProblems(runner)).toStrictEqual([
      "location 0 of test reads no key and marks nothing",
      "location 1 of test gives way to testRegex, which it does not read",
      "location 2 of build-and-infrastructure marks a file and names none",
    ])
  })

  it("reports a library with no category", () => {
    expect(listLibraryProblems({ ...libraryWith([route]), category: " " })).toStrictEqual(["has no category"])
  })

  it("reports a library with no name", () => {
    expect(listLibraryProblems(libraryWith([route], " "))).toStrictEqual(["has no name"])
  })

  it("reports a library that does not say which documentation it was written from", () => {
    expect(listLibraryProblems({ ...libraryWith([route]), documentedVersion: undefined })).toStrictEqual([
      "does not say which version of the documentation it was written from",
    ])
  })

  it("reports a specifier listed twice in one library", () => {
    expect(listLibraryProblems(libraryWith([route], "Express", ["express", "express"]))).toStrictEqual(["express is listed more than once"])
  })

  it("reports a pattern listed twice for the same versions", () => {
    expect(listLibraryProblems(libraryWith([route, route]))).toStrictEqual(["call:post:* is listed more than once"])
  })

  it("accepts one name listed once per range of versions", () => {
    const older: CataloguePattern = { kind: "call", name: "useQuery", versions: "<5", slots: [{ at: 1, runs: "effect" }] }
    const newer: CataloguePattern = { kind: "call", name: "useQuery", versions: ">=5", slots: [{ at: "queryFn", runs: "effect" }] }

    expect(listLibraryProblems(libraryWith([older, newer]))).toStrictEqual([])
  })

  it("reports a call pattern that says nothing", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "call", name: "noop", slots: [] }]))).toStrictEqual([
      "call:noop:* says nothing: it has no slot, makes nothing and names no path or event",
    ])
  })

  it("accepts a call pattern with no slot that makes a block", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "call", name: "findMany", slots: [], makes: "data" }]))).toStrictEqual([])
  })

  it("reports a route slot with no place for its path", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "call", name: "post", slots: [{ at: "last", runs: "route" }], method: "POST" }]))).toStrictEqual([
      "call:post:* has a route or a page slot and no pathAt",
    ])
  })

  it("reports a route slot with no method", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "call", name: "post", slots: [{ at: "last", runs: "route" }], pathAt: 0 }]))).toStrictEqual([
      "call:post:* has a route slot and neither method nor methodAt",
    ])
  })

  it("accepts a route slot whose method is read from the call", () => {
    const routeOfAnyMethod: CataloguePattern = { kind: "call", name: "add_api_route", slots: [{ at: 1, runs: "route" }], pathAt: 0, methodAt: "methods" }

    expect(listLibraryProblems(libraryWith([routeOfAnyMethod]))).toStrictEqual([])
  })

  it("accepts a page slot with no method", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "call", name: "route", slots: [{ at: "element", runs: "page" }], pathAt: "path" }]))).toStrictEqual([])
  })

  it("reports the problems of a method under its factory", () => {
    const factory: CataloguePattern = { kind: "factory", name: "Router", methods: [{ kind: "call", name: "use", slots: [] }] }

    expect(listLibraryProblems(libraryWith([factory]))).toStrictEqual([
      "factory:Router:* call:use:* says nothing: it has no slot, makes nothing and names no path or event",
    ])
  })

  it("reports the problems of a decorator under its factory", () => {
    const factory: CataloguePattern = { kind: "factory", name: "FastAPI", methods: [{ kind: "decorator", name: "get", runs: "route", pathAt: 0 }] }

    expect(listLibraryProblems(libraryWith([factory]))).toStrictEqual([
      "factory:FastAPI:* decorator:get:* runs a route and has neither method nor methodAt",
    ])
  })

  it("accepts a route with no path below a factory that names a prefix", () => {
    const routeOfOnePath: CataloguePattern = { kind: "call", name: "get", slots: [{ at: "last", runs: "route" }], method: "GET" }
    const factory: CataloguePattern = {
      kind: "factory",
      name: "Router",
      methods: [{ kind: "factory", name: "route", prefixAt: 0, methods: [routeOfOnePath] }],
    }

    expect(listLibraryProblems(libraryWith([factory]))).toStrictEqual([])
  })

  it("reports a route with no path below a factory that names no prefix", () => {
    const routeOfOnePath: CataloguePattern = { kind: "call", name: "get", slots: [{ at: "last", runs: "route" }], method: "GET" }
    const factory: CataloguePattern = { kind: "factory", name: "Router", methods: [{ kind: "factory", name: "route", methods: [routeOfOnePath] }] }

    expect(listLibraryProblems(libraryWith([factory]))).toStrictEqual([
      "factory:Router:* factory:route:* call:get:* has a route or a page slot and no pathAt",
    ])
  })

  it("accepts a call that only names a prefix", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "call", name: "include_router", slots: [], prefixAt: "prefix" }]))).toStrictEqual([])
  })

  it("accepts a call that only reads a provided value", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "call", name: "useContext", slots: [], reads: { keyAt: 0 } }]))).toStrictEqual([])
  })

  it("accepts a factory with no method whose value provides", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "factory", name: "createContext", methods: [], provides: { valueAt: "value" } }]))).toStrictEqual([])
  })

  it("reports an element that says nothing", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "element", name: "Link", slots: [] }]))).toStrictEqual([
      "element:Link:* says nothing: it has no slot, makes nothing and neither provides nor reads a value",
    ])
  })

  it("accepts an element that makes a block", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "element", name: "Link", slots: [], makes: "navigation", pathAt: "to" }]))).toStrictEqual([])
  })

  it("reports a pattern imported from a specifier its library does not have", () => {
    const link: CataloguePattern = { kind: "element", name: "default", from: "next/link", slots: [], makes: "navigation" }

    expect(listLibraryProblems(libraryWith([link]))).toStrictEqual([
      "element:default@next/link:* is imported from next/link, which is no specifier of its library",
    ])
  })

  it("reports a directive with no text", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "directive", text: " ", runs: "route" }]))).toStrictEqual(["directive: :* has no text"])
  })

  it("accepts a directive that runs a route with no path and no method", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "directive", text: "use server", runs: "route" }]))).toStrictEqual([])
  })

  it("reports a factory with no method that makes nothing", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "factory", name: "createApi", methods: [] }]))).toStrictEqual([
      "factory:createApi:* has no method and makes nothing",
    ])
  })

  it("reports a decorator that runs a route and has no place for its path", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "decorator", name: "Get", runs: "route", method: "GET" }]))).toStrictEqual([
      "decorator:Get:* runs a route or a page and has no pathAt",
    ])
  })

  it("accepts a decorator that runs something with no path", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "decorator", name: "middleware", runs: "middleware" }]))).toStrictEqual([])
  })

  it("accepts a decorator that only makes a block", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "decorator", name: "lru_cache", makes: "cache" }]))).toStrictEqual([])
  })

  it("reports a file pattern that names no export", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "file", glob: "app/**/page.tsx", exports: [] }]))).toStrictEqual([
      "file:app/**/page.tsx:* names no export",
    ])
  })

  it("reports a route export with no method", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "file", glob: "app/**/route.ts", exports: [{ name: "GET", runs: "route" }] }]))).toStrictEqual([
      "file:app/**/route.ts:* exports the route GET with no method",
    ])
  })
})

describe("listCatalogueProblems", () => {
  it("names the library each problem is in", () => {
    expect(listCatalogueProblems([libraryWith([]), libraryWith([], "Tests and stories", [])])).toStrictEqual([
      "Express: has no pattern and no location",
      "Tests and stories: has no pattern and no location",
    ])
  })

  it("reports a specifier in more than one library file", () => {
    expect(listCatalogueProblems([libraryWith([route]), libraryWith([route], "Express 4")])).toStrictEqual([
      "express of javascript is in more than one library file",
    ])
  })

  it("accepts one specifier in a library of each language", () => {
    const joseForPython: CatalogueLibrary = { ...libraryWith([route], "python-jose", ["jose"]), language: "python" }

    expect(listCatalogueProblems([libraryWith([route], "jose", ["jose"]), joseForPython])).toStrictEqual([])
  })

  it("reports the problems of a method of what a factory makes when it is called", () => {
    const factory: CataloguePattern = {
      kind: "factory",
      name: "defineStore",
      methods: [],
      called: { slots: [], methods: [{ kind: "call", name: "$subscribe", slots: [] }] },
    }

    expect(listLibraryProblems(libraryWith([factory]))).toStrictEqual([
      "factory:defineStore:* called call:$subscribe:* says nothing: it has no slot, makes nothing and names no path or event",
    ])
  })

  it("accepts a factory that only says what the value it makes is when called", () => {
    const factory: CataloguePattern = { kind: "factory", name: "postgres", methods: [], called: { slots: [], makes: "data" } }

    expect(listLibraryProblems(libraryWith([factory]))).toStrictEqual([])
  })

  it("reports a factory with a page slot", () => {
    const factory: CataloguePattern = { kind: "factory", name: "createRouter", methods: [], slots: [{ at: "routes[].component", runs: "page" }] }

    expect(listLibraryProblems(libraryWith([factory]))).toStrictEqual([
      "factory:createRouter:* has a route or a page slot, which a factory cannot give a path",
    ])
  })

  it("reports a class that says nothing", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "class", name: "Model", members: [], methods: [] }]))).toStrictEqual([
      "class:Model:* says nothing: it has no member and no method, and makes nothing",
    ])
  })

  it("reports a route member of a class with no method", () => {
    const handler: CataloguePattern = { kind: "class", name: "RequestHandler", members: [{ name: "get", runs: "route" }], methods: [] }

    expect(listLibraryProblems(libraryWith([handler]))).toStrictEqual(["class:RequestHandler:* has the route member get with no method"])
  })

  it("reports the problems of a method of a class under it", () => {
    const model: CataloguePattern = { kind: "class", name: "Model", members: [], methods: [{ kind: "call", name: "findAll", slots: [] }] }

    expect(listLibraryProblems(libraryWith([model]))).toStrictEqual([
      "class:Model:* call:findAll:* says nothing: it has no slot, makes nothing and names no path or event",
    ])
  })

  it("accepts a decorator that only names a prefix", () => {
    expect(listLibraryProblems(libraryWith([{ kind: "decorator", name: "Controller", prefixAt: 0 }]))).toStrictEqual([])
  })

  it("reports a name of more than one library file", () => {
    expect(listCatalogueProblems([libraryWith([route]), libraryWith([route], "Express", ["express-promise-router"])])).toStrictEqual([
      "Express is the name of more than one library file",
    ])
  })

  it("accepts several libraries of repository conventions", () => {
    const pages = libraryWith([{ kind: "file", glob: "app/**/page.tsx", exports: [{ name: "default", runs: "page" }] }], "File routes", [])
    const tests: CatalogueLibrary = { ...libraryWith([], "unittest", []), locations: [{ classification: "test", files: [], keys: [{ key: "pattern", holds: "names", default: ["test*.py"] }] }] }

    expect(listCatalogueProblems([pages, tests])).toStrictEqual([])
  })
})
